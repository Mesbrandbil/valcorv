import { Config } from '@remotion/cli/config';

// The pre-installed Chromium in the cloud container; on a Mac, leave BROWSER_EXECUTABLE unset.
if (process.env.BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.BROWSER_EXECUTABLE);
}
Config.setVideoImageFormat('png');
Config.setConcurrency(2);
