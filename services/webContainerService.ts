import { WebContainer } from '@webcontainer/api';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

let webcontainerInstance: WebContainer | null = null;
let devProcessInstance: any = null;

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

export async function readFile(path: string): Promise<string> {
  const wc = await getWebContainer();
  const content = await wc.fs.readFile(path, 'utf-8');
  return content;
}

export async function writeFile(path: string, content: string): Promise<void> {
  const wc = await getWebContainer();
  await wc.fs.writeFile(path, content);
}

export async function readDir(path: string): Promise<any[]> {
  const wc = await getWebContainer();
  const entries = await wc.fs.readdir(path, { withFileTypes: true });
  return entries;
}

export async function getProjectTree(path: string = '/'): Promise<Record<string, any>> {
  const wc = await getWebContainer();
  const entries = await wc.fs.readdir(path, { withFileTypes: true });
  const tree: Record<string, any> = {};
  
  for (const entry of entries) {
    const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        tree[entry.name] = {
          directory: await getProjectTree(fullPath)
        };
      }
    } else {
      try {
        tree[entry.name] = {
          file: {
            contents: await wc.fs.readFile(fullPath, 'utf-8')
          }
        };
      } catch (e) {
        // Ignore binary files or files that can't be read as utf-8
      }
    }
  }
  return tree;
}

let serverReadyUnsubscribe: (() => void) | null = null;

export async function startDevServer(
  onOutput: (data: string) => void,
  onUrlReady: (url: string) => void,
  onError?: (error: string) => void
) {
  const wc = await getWebContainer();
  
  if (devProcessInstance) {
    devProcessInstance.kill();
  }
  
  if (serverReadyUnsubscribe) {
    serverReadyUnsubscribe();
    serverReadyUnsubscribe = null;
  }

  // Install dependencies
  const installProcess = await wc.spawn('npm', ['install']);
  
  let installErrorOutput = '';
  installProcess.output.pipeTo(new WritableStream({
    write(data) {
      onOutput(data);
      installErrorOutput += data;
    }
  }));
  
  const installExitCode = await installProcess.exit;
  if (installExitCode !== 0) {
    onOutput('\r\nInstallation failed\r\n');
    if (onError) onError(installErrorOutput);
    throw new Error('Installation failed');
  }
  
  onOutput('\r\nDependencies installed. Starting dev server...\r\n');

  // Start dev server
  const devProcess = await wc.spawn('npm', ['run', 'dev']);
  devProcessInstance = devProcess;
  
  let devErrorOutput = '';
  devProcess.output.pipeTo(new WritableStream({
    write(data) {
      onOutput(data);
      devErrorOutput += data;
    }
  }));

  devProcess.exit.then((code) => {
    if (code !== 0 && onError) {
      onError(devErrorOutput);
    }
  });

  // Wait for server-ready event
  serverReadyUnsubscribe = wc.on('server-ready', (port, url) => {
    onOutput(`\r\nServer ready at ${url}\r\n`);
    onUrlReady(url);
  });
}

export async function downloadProject() {
  const wc = await getWebContainer();
  const zip = new JSZip();

  async function addFilesToZip(currentPath: string, currentZipFolder: JSZip) {
    const entries = await wc.fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          const newFolder = currentZipFolder.folder(entry.name);
          if (newFolder) {
            await addFilesToZip(fullPath, newFolder);
          }
        }
      } else {
        const content = await wc.fs.readFile(fullPath);
        currentZipFolder.file(entry.name, content);
      }
    }
  }

  await addFilesToZip('/', zip);
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'webcontainer-project.zip');
}
