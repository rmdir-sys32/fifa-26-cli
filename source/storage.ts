import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';

export const CONFIG_DIR =
	os.platform() === 'win32'
		? path.join(
				process.env['APPDATA'] || path.join(os.homedir(), 'AppData', 'Roaming'),
				'fifa-live-cli',
		  )
		: path.join(os.homedir(), '.config', 'fifa-live-cli');

export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface AppConfig {
	API_KEY?: string;
}

export async function readConfig(): Promise<AppConfig> {
	try {
		if (existsSync(CONFIG_FILE)) {
			const data = await fs.readFile(CONFIG_FILE, 'utf-8');
			return JSON.parse(data) as AppConfig;
		}
	} catch {
		// Silent recovery
	}
	return {};
}

export async function writeConfig(config: AppConfig): Promise<void> {
	try {
		await fs.mkdir(CONFIG_DIR, {recursive: true});
		await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
	} catch {
		// Silent recovery
	}
}
