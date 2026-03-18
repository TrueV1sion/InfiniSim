import { WebContainer } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;

export async function getWebContainer(): Promise<WebContainer> {
  if (!webcontainerInstance) {
    webcontainerInstance = await WebContainer.boot();
  }
  return webcontainerInstance;
}

export async function mountFiles(files: Record<string, any>) {
  const wc = await getWebContainer();
  await wc.mount(files);
}

export async function startDevServer(
  onOutput: (data: string) => void,
  onUrlReady: (url: string) => void
) {
  const wc = await getWebContainer();
  
  // Install dependencies
  const installProcess = await wc.spawn('npm', ['install']);
  installProcess.output.pipeTo(new WritableStream({
    write(data) {
      onOutput(data);
    }
  }));
  
  const installExitCode = await installProcess.exit;
  if (installExitCode !== 0) {
    onOutput('\r\nInstallation failed\r\n');
    throw new Error('Installation failed');
  }
  
  onOutput('\r\nDependencies installed. Starting dev server...\r\n');

  // Start dev server
  const devProcess = await wc.spawn('npm', ['run', 'dev']);
  devProcess.output.pipeTo(new WritableStream({
    write(data) {
      onOutput(data);
    }
  }));

  // Wait for server-ready event
  wc.on('server-ready', (port, url) => {
    onOutput(`\r\nServer ready at ${url}\r\n`);
    onUrlReady(url);
  });
}
