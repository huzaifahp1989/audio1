package com.islammediacentral.app.audio;

import android.content.Context;
import androidx.annotation.NonNull;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AndroidAuto")
public class AndroidAutoPlugin extends Plugin {
    static final String PREFERENCES = "android_auto_library";
    static final String TRACKS_KEY = "tracks";
    static final String PLAYLISTS_KEY = "playlists";

    @PluginMethod
    public void publishLibrary(@NonNull PluginCall call) {
        JSArray tracks = call.getArray("tracks");
        JSArray playlists = call.getArray("playlists");
        if (tracks == null || playlists == null) {
            call.reject("tracks and playlists are required");
            return;
        }
        getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .putString(TRACKS_KEY, tracks.toString())
            .putString(PLAYLISTS_KEY, playlists.toString())
            .apply();
        IslamicAudioLibraryService.notifyLibraryChanged();
        call.resolve();
    }
}