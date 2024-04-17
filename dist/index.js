var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { platform } from "os";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { systemPrompt, userPrompt } from "./prompts.js";
import chalk from "chalk";
import { exec } from "child_process";
const { yellow, cyan, red, blue } = chalk;
const ARGS = {
    origQuestion: '',
    question: '',
};
const getCommands = (input) => __awaiter(void 0, void 0, void 0, function* () {
    const chatModel = new ChatOpenAI({
    // openAIApiKey: process.env.OPENAI_API_KEY as string, // Cast to string; TypeScript won't automatically infer process.env types.
    });
    const prompt = ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        ['user', userPrompt],
    ]);
    const chain = prompt.pipe(chatModel);
    const response = yield chain.invoke({ input });
    // const response: any = await chain.invoke({ content: 'what is the ram on this pc?' })
    return response.content;
});
const processArgs = () => {
    // Read all files in the chapter directory
    const myos = process.platform;
    const origQuestion = process.argv.slice(2).join(' ');
    ARGS.origQuestion = origQuestion;
    ARGS.question = [
        `My operating system is ${myos}. `,
        `The time is ${new Date()}. `,
        `And my question is: ${origQuestion}`,
    ].join('');
};
const getCommandByIndex = (commands, choice) => {
    const index = parseInt(choice);
    if (index > commands.length) {
        console.log('Invalid choice');
        process.exit(1);
    }
    return commands[index - 1];
};
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    processArgs();
    console.log(blue(`Question: ${ARGS.origQuestion}`));
    process.stdout.write(blue('Thinking ... '));
    const t1 = (new Date()).valueOf();
    const response = yield getCommands(ARGS.question);
    const t2 = (new Date()).valueOf();
    console.log(blue(`[${(t2 - t1) / 1000} s]`));
    // get the user to enter a question from the terminal
    const commands = response.split('===').map(x => x.trim()).filter(x => x);
    console.log(yellow('Choose a command to run:'));
    commands.forEach((command, i) => {
        const cmd = command.split('\n').filter(x => x.trim());
        if (cmd.length > 1) {
            console.log(`  ${cyan(`${i + 1}:`)}`);
            cmd.forEach(line => {
                console.log(`   ${cyan(':')} ${line}`);
            });
        }
        else {
            console.log(`  ${cyan(`${i + 1}:`)} ${command}`);
        }
    });
    if (commands.length === 0) {
        console.log('No commands found');
        process.exit(1);
    }
    else {
        const commonOpts = `[${cyan('Q')}uit/${cyan('C')}opy to clipboard]: `;
        console.log(red(`WARNING: LLM's can hallucinate. Run at your own risk.`));
        if (commands.length === 1) {
            process.stdout.write(yellow(commonOpts));
        }
        else {
            process.stdout.write(yellow(`Command ${cyan('#')} or ${commonOpts}`));
        }
    }
    const choice = yield new Promise(resolve => {
        process.stdin.resume();
        process.stdin.once('data', data => {
            const choice = data.toString().trim();
            resolve(choice);
        });
    });
    if (choice.toLowerCase() === 'q') {
        process.exit(0);
    }
    const command = getCommandByIndex(commands, choice);
    if (choice.toLowerCase() === 'c') {
        process.stdout.write(yellow(`Command ${cyan('#')} to copy to clipboard: `));
        const choice = yield new Promise((resolve, reject) => {
            process.stdin.resume();
            process.stdin.once('data', data => {
                const choice = data.toString().trim();
                resolve(choice);
            });
        });
        const commandToCopy = getCommandByIndex(commands, choice);
        const sysCopyProg = platform() === 'darwin' ? 'pbcopy' : 'xclip';
        console.log(`Copy command is ${sysCopyProg}`);
        exec(`echo "${commandToCopy}" | ${sysCopyProg}`, function (err, stdout, stderr) {
            if (err) {
                console.error(err);
            }
            console.log("Copied to clipboard!");
            console.log(commandToCopy);
            process.exit(0);
        });
    }
    else {
        // copy the command into the clipboard
        exec(command, function (err, stdout, stderr) {
            if (err) {
                console.error(err);
            }
            console.log(stdout);
            console.error(stderr);
            process.exit(0);
        });
    }
});
main();
