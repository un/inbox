import Fs from 'fs';
import Path, { join } from 'path';

const FIXTURE_DIR = join(import.meta.dirname, 'fixtures');

class Fixture {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  get inputPath(): string {
    return Path.join(FIXTURE_DIR, this.name + '.input.html');
  }
  get outputMessagePath(): string {
    return Path.join(FIXTURE_DIR, this.name + '.output-message.html');
  }
  get outputCompletePath(): string {
    return Path.join(FIXTURE_DIR, this.name + '.output-complete.html');
  }

  get input(): string {
    return Fs.readFileSync(this.inputPath).toString();
  }
  get outputMessage(): string {
    return Fs.readFileSync(this.outputMessagePath).toString();
  }
  get outputComplete(): string {
    return Fs.readFileSync(this.outputCompletePath).toString();
  }

  hasInput(): boolean {
    return Fs.existsSync(this.inputPath);
  }
  hasOutputMessage(): boolean {
    return Fs.existsSync(this.outputMessagePath);
  }
  hasOutputComplete(): boolean {
    return Fs.existsSync(this.outputCompletePath);
  }
}

function listFixtures(): Fixture[] {
  const files: string[] = Fs.readdirSync(FIXTURE_DIR);

  const inputs = files.filter((path) => {
    return path.endsWith('.input.html');
  });

  const fixtures = inputs
    .map((path) => Path.basename(path, '.input.html'))
    .map((name) => new Fixture(name));

  return fixtures;
}

export { Fixture, listFixtures };
