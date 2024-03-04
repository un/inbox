import Fs from 'fs';
import { listFixtures } from './fixtures';
import { parseMessage } from '../../parseMessage';
import { formatHtml } from '../utils';
import testOptions from './prepareMessageTestOptions';

listFixtures()
  .filter(
    (fixture) => !fixture.hasOutputComplete() && !fixture.hasOutputMessage()
  )
  .forEach(async (fixture) => {
    console.log('Found lonely input fixture: ' + fixture.name);

    const result = await parseMessage(fixture.input, testOptions);

    Fs.writeFileSync(
      fixture.outputMessagePath,
      await formatHtml(result.parsedMessageHtml)
    );
    console.log('Wrote: ' + fixture.outputMessagePath);

    Fs.writeFileSync(
      fixture.outputCompletePath,
      await formatHtml(result.completeHtml)
    );
    console.log('Wrote: ' + fixture.outputCompletePath);
  });
