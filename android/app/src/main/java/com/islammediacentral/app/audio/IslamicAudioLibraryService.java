package com.islammediacentral.app.audio;

import android.content.Context;
import android.net.Uri;
import androidx.annotation.Nullable;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.LibraryResult;
import androidx.media3.session.MediaLibraryService;
import androidx.media3.session.MediaSession;
import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

public class IslamicAudioLibraryService extends MediaLibraryService {
    private static final String ROOT_ID = "root";
    private static final String PLAYLISTS_ID = "playlists";
    private static IslamicAudioLibraryService activeService;
    private MediaLibrarySession session;
    private ExoPlayer player;
    private final Map<String, List<MediaItem>> categories = new LinkedHashMap<>();
    private final Map<String, List<MediaItem>> playlists = new LinkedHashMap<>();
    private final Map<String, String> playlistNames = new LinkedHashMap<>();
    private final Map<String, MediaItem> tracks = new LinkedHashMap<>();

    @Override
    public void onCreate() {
        super.onCreate();
        activeService = this;
        player = new ExoPlayer.Builder(this).build();
        session = new MediaLibrarySession.Builder(this, player, new LibraryCallback()).build();
        loadLibrary();
    }

    @Nullable
    @Override
    public MediaLibrarySession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return session;
    }

    @Override
    public void onDestroy() {
        activeService = null;
        session.release();
        player.release();
        super.onDestroy();
    }

    static void notifyLibraryChanged() {
        IslamicAudioLibraryService service = activeService;
        if (service == null) return;
        service.loadLibrary();
        service.session.notifyChildrenChanged(ROOT_ID, service.categories.size() + (service.playlists.isEmpty() ? 0 : 1), null);
    }

    private void loadLibrary() {
        categories.clear();
        playlists.clear();
        playlistNames.clear();
        tracks.clear();
        String json = getSharedPreferences(AndroidAutoPlugin.PREFERENCES, Context.MODE_PRIVATE)
            .getString(AndroidAutoPlugin.TRACKS_KEY, "[]");
        try {
            JSONArray items = new JSONArray(json);
            for (int index = 0; index < items.length(); index++) {
                JSONObject item = items.getJSONObject(index);
                String id = item.optString("id");
                String audioUrl = item.optString("audioUrl");
                if (id.isEmpty() || audioUrl.isEmpty()) continue;
                String category = item.optString("category", "Other");
                MediaMetadata.Builder metadata = new MediaMetadata.Builder()
                    .setTitle(item.optString("title", "Untitled"))
                    .setArtist(item.optString("artist", "Islamic Audio"))
                    .setAlbumTitle(category)
                    .setIsPlayable(true);
                String imageUrl = item.optString("imageUrl");
                if (!imageUrl.isEmpty()) metadata.setArtworkUri(Uri.parse(imageUrl));
                MediaItem mediaItem = new MediaItem.Builder()
                    .setMediaId(id)
                    .setUri(audioUrl)
                    .setMediaMetadata(metadata.build())
                    .build();
                tracks.put(id, mediaItem);
                categories.computeIfAbsent(category, ignored -> new ArrayList<>()).add(mediaItem);
            }
        } catch (Exception ignored) {
            // Keep an empty library if persisted data is invalid.
        }
        loadPlaylists();
    }

    private void loadPlaylists() {
        String json = getSharedPreferences(AndroidAutoPlugin.PREFERENCES, Context.MODE_PRIVATE)
            .getString(AndroidAutoPlugin.PLAYLISTS_KEY, "[]");
        try {
            JSONArray items = new JSONArray(json);
            for (int index = 0; index < items.length(); index++) {
                JSONObject item = items.getJSONObject(index);
                String id = item.optString("id");
                if (id.isEmpty()) continue;
                List<MediaItem> playlistTracks = new ArrayList<>();
                JSONArray trackIds = item.optJSONArray("trackIds");
                if (trackIds != null) {
                    for (int trackIndex = 0; trackIndex < trackIds.length(); trackIndex++) {
                        MediaItem track = tracks.get(trackIds.optString(trackIndex));
                        if (track != null) playlistTracks.add(track);
                    }
                }
                if (!playlistTracks.isEmpty()) {
                    playlists.put(id, playlistTracks);
                    playlistNames.put(id, item.optString("name", "Playlist"));
                }
            }
        } catch (Exception ignored) {
            // Keep playlists empty if persisted data is invalid.
        }
    }

    private final class LibraryCallback implements MediaLibrarySession.Callback {
        @Override
        public ListenableFuture<LibraryResult<MediaItem>> onGetLibraryRoot(
            MediaLibrarySession mediaSession, MediaSession.ControllerInfo browser, LibraryParams params) {
            MediaItem root = new MediaItem.Builder().setMediaId(ROOT_ID).setMediaMetadata(
                new MediaMetadata.Builder().setTitle("Islam Media Central").setIsBrowsable(true).build()).build();
            return Futures.immediateFuture(LibraryResult.ofItem(root, params));
        }

        @Override
        public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetChildren(
            MediaLibrarySession mediaSession, MediaSession.ControllerInfo browser, String parentId,
            int page, int pageSize, LibraryParams params) {
            List<MediaItem> children = new ArrayList<>();
            if (ROOT_ID.equals(parentId)) {
                if (!playlists.isEmpty()) {
                    children.add(new MediaItem.Builder().setMediaId(PLAYLISTS_ID).setMediaMetadata(
                        new MediaMetadata.Builder().setTitle("Ready-made playlists").setIsBrowsable(true).build()).build());
                }
                for (String category : categories.keySet()) {
                    children.add(new MediaItem.Builder().setMediaId("category:" + category).setMediaMetadata(
                        new MediaMetadata.Builder().setTitle(category).setIsBrowsable(true).build()).build());
                }
            } else if (PLAYLISTS_ID.equals(parentId)) {
                for (String playlistId : playlists.keySet()) {
                    children.add(new MediaItem.Builder().setMediaId("playlist:" + playlistId).setMediaMetadata(
                        new MediaMetadata.Builder().setTitle(playlistNames.get(playlistId)).setIsBrowsable(true).build()).build());
                }
            } else if (parentId.startsWith("playlist:")) {
                children.addAll(playlists.getOrDefault(parentId.substring(9), new ArrayList<>()));
            } else if (parentId.startsWith("category:")) {
                children.addAll(categories.getOrDefault(parentId.substring(9), new ArrayList<>()));
            }
            int from = Math.min(page * pageSize, children.size());
            int to = Math.min(from + pageSize, children.size());
            return Futures.immediateFuture(LibraryResult.ofItemList(children.subList(from, to), params));
        }

        @Override
        public ListenableFuture<LibraryResult<MediaItem>> onGetItem(
            MediaLibrarySession mediaSession, MediaSession.ControllerInfo browser, String mediaId) {
            MediaItem item = tracks.get(mediaId);
            return Futures.immediateFuture(item == null
                ? LibraryResult.ofError(LibraryResult.RESULT_ERROR_BAD_VALUE)
                : LibraryResult.ofItem(item, null));
        }

        @Override
        public ListenableFuture<List<MediaItem>> onAddMediaItems(
            MediaSession mediaSession, MediaSession.ControllerInfo controller, List<MediaItem> mediaItems) {
            List<MediaItem> resolved = new ArrayList<>();
            for (MediaItem requested : mediaItems) {
                MediaItem item = tracks.get(requested.mediaId);
                if (item != null) resolved.add(item);
            }
            return Futures.immediateFuture(resolved);
        }
    }
}