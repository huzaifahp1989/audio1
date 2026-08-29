package com.islammediacentral.app;

import com.getcapacitor.BridgeActivity;
import com.islammediacentral.app.audio.AndroidAutoPlugin;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(android.os.Bundle savedInstanceState) {
		registerPlugin(AndroidAutoPlugin.class);
		super.onCreate(savedInstanceState);
	}
}
