import Fs from "fs";
import { listFixtures } from "./fixtures";
import prepareMessage from "../../prepareMessage";
import { formatHtml } from "../utils";
import testOptions from "./prepareMessageTestOptions";

/*************************************

  Find all *.input.html that have no *.output-*.html, and write the output
  of `prepareMessage` for it.

 *************************************/

listFixtures()
  .filter(
    (fixture) => !fixture.hasOutputComplete() && !fixture.hasOutputMessage()
  )
  .forEach(async (fixture) => {
    console.log("Found lonely input fixture: " + fixture.name);

    const result = prepareMessage(fixture.input, testOptions);

    Fs.writeFileSync(
      fixture.outputMessagePath,
      await formatHtml(result.messageHtml)
    );
    console.log("Wrote: " + fixture.outputMessagePath);

    Fs.writeFileSync(
      fixture.outputCompletePath,
      await formatHtml(result.completeHtml)
    );
    console.log("Wrote: " + fixture.outputCompletePath);
  });
