package com.tabuada.divertida;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
  private Long activeDownloadId = null;
  private File activeFile = null;
  private BroadcastReceiver downloadReceiver = null;

  @PluginMethod
  public void getAppInfo(PluginCall call) {
    try {
      Context ctx = getContext();
      PackageManager pm = ctx.getPackageManager();
      PackageInfo pi;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        pi = pm.getPackageInfo(ctx.getPackageName(), PackageManager.PackageInfoFlags.of(0));
      } else {
        pi = pm.getPackageInfo(ctx.getPackageName(), 0);
      }

      JSObject ret = new JSObject();
      ret.put("packageName", ctx.getPackageName());
      ret.put("versionName", pi.versionName);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        ret.put("versionCode", pi.getLongVersionCode());
      } else {
        ret.put("versionCode", pi.versionCode);
      }
      ret.put("canRequestPackageInstalls", canRequestPackageInstalls());
      call.resolve(ret);
    } catch (Exception e) {
      call.reject("failed_to_get_app_info", e);
    }
  }

  @PluginMethod
  public void openInstallPermissionSettings(PluginCall call) {
    try {
      Context ctx = getContext();
      Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
      intent.setData(Uri.parse("package:" + ctx.getPackageName()));
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      ctx.startActivity(intent);
      call.resolve();
    } catch (Exception e) {
      call.reject("failed_to_open_settings", e);
    }
  }

  @PluginMethod
  public void downloadAndInstall(PluginCall call) {
    String url = call.getString("url");
    String fileName = call.getString("fileName");

    if (url == null || url.trim().isEmpty()) {
      call.reject("missing_url");
      return;
    }

    if (!canRequestPackageInstalls()) {
      JSObject ret = new JSObject();
      ret.put("needsPermission", true);
      ret.put("canRequestPackageInstalls", false);
      call.resolve(ret);
      return;
    }

    try {
      Context ctx = getContext();
      if (fileName == null || fileName.trim().isEmpty()) {
        fileName = "update.apk";
      }

      File dir = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
      if (dir == null) {
        call.reject("no_external_files_dir");
        return;
      }

      activeFile = new File(dir, fileName);
      if (activeFile.exists()) {
        activeFile.delete();
      }

      DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
      DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
      req.setTitle(fileName);
      req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
      req.setAllowedOverMetered(true);
      req.setAllowedOverRoaming(true);
      req.setDestinationInExternalFilesDir(ctx, Environment.DIRECTORY_DOWNLOADS, fileName);

      activeDownloadId = dm.enqueue(req);

      registerDownloadReceiver();

      JSObject ret = new JSObject();
      ret.put("started", true);
      ret.put("downloadId", activeDownloadId);
      call.resolve(ret);
    } catch (Exception e) {
      call.reject("failed_to_start_download", e);
    }
  }

  private boolean canRequestPackageInstalls() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return true;
    }
    return getContext().getPackageManager().canRequestPackageInstalls();
  }

  private void registerDownloadReceiver() {
    if (downloadReceiver != null) {
      return;
    }

    downloadReceiver = new BroadcastReceiver() {
      @Override
      public void onReceive(Context context, Intent intent) {
        if (activeDownloadId == null) {
          return;
        }
        long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
        if (id != activeDownloadId) {
          return;
        }
        unregisterDownloadReceiver();
        openInstaller();
      }
    };

    Context ctx = getContext();
    IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      ctx.registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
    } else {
      ctx.registerReceiver(downloadReceiver, filter);
    }
  }

  private void unregisterDownloadReceiver() {
    if (downloadReceiver == null) {
      return;
    }
    try {
      getContext().unregisterReceiver(downloadReceiver);
    } catch (Exception ignored) {
    }
    downloadReceiver = null;
  }

  private void openInstaller() {
    Context ctx = getContext();

    if (activeFile == null || !activeFile.exists()) {
      return;
    }

    Uri apkUri = FileProvider.getUriForFile(
      ctx,
      ctx.getPackageName() + ".fileprovider",
      activeFile
    );

    Intent intent = new Intent(Intent.ACTION_VIEW);
    intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

    ctx.startActivity(intent);
  }

  @Override
  protected void handleOnDestroy() {
    unregisterDownloadReceiver();
    super.handleOnDestroy();
  }
}
