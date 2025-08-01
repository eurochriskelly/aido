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
import chalk from "chalk";
import { exec } from "child_process";
import { readChar } from "./utils.js";
import { getCommands, getCommandByIndex, showCommands, createShellHistoryScript } from "./commands.js";
const { yellow, cyan, red, blue } = chalk;
const ARGS = {
    origQuestion: '',
    question: '',
};
const processArgs = () => __awaiter(void 0, void 0, void 0, function* () {
    // Read all files in the chapter directory
    const myos = process.platform;
    let origQuestion = process.argv.slice(2).join(' ');
    if (!origQuestion.trim()) {
        // Ask the user what they want
        process.stdout.write(yellow('How may I assist ? '));
        origQuestion = yield new Promise(resolve => {
            process.stdin.resume();
            process.stdin.once('data', data => resolve(data.toString().trim()));
        });
    }
    ARGS.origQuestion = origQuestion;
    ARGS.question = [
        `Hello Jeff. My operating system is ${myos}. `,
        `The time is ${new Date()}. `,
        `And my question is: ${origQuestion}`,
    ].join('');
});
const explainCommand = (command) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('');
    console.log(blue('Selected command:'));
    console.log(`  ${cyan(':')} ${command.command}`);
    console.log(blue('Explanation: '));
    let exp = command === null || command === void 0 ? void 0 : command.explanation;
    if (!exp) {
        exp = yield getCommands('explain', [
            `Hi Jeff, I asked you this question: `,
            `Question: "${ARGS.question}"`,
            `You provided me with this command.`,
            `${command.command}`,
            `Please explain what it does: `,
            ''
        ].join('\n'));
    }
    console.log(exp === null || exp === void 0 ? void 0 : exp.split('\n').filter(x => x.trim()).filter(x => x !== '===').map(x => `  ${cyan(':')} ${x}`).join('\n'));
    return 'x';
});
const copyToClipboard = (command) => __awaiter(void 0, void 0, void 0, function* () {
    const sysCopyProg = platform() === 'darwin' ? 'pbcopy' : (platform() === 'linux' ? 'xclip -selection clipboard' : undefined);
    if (!sysCopyProg) {
        console.error(red('Clipboard utility not available on this platform.'));
        process.exit(1);
    }
    const commandToClipboard = `echo "${command.replace(/"/g, '\\"')}" | ${sysCopyProg}`;
    console.log(commandToClipboard);
    exec(commandToClipboard, function (err, stdout, stderr) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('copying to clipboard ...');
            if (err) {
                console.error(err);
            }
            console.log(blue("Copied to clipboard!"));
        });
    });
});
const goodBye = () => {
    console.log(blue('Goodbye!'));
    process.exit(0);
};
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    // hallucinateWarning();
    yield processArgs();
    console.log(blue(`Question: "${ARGS.origQuestion}"`));
    process.stdout.write(blue('Thinking ... '));
    const commands = yield showCommands(ARGS.question);
    // get the user to provide a single char and then proceed. Do not wait for confirmation
    const choice = yield readChar();
    console.log(choice); // echo choice so user sees that they typed
    if (choice === '\u0003' || !choice.trim()) {
        console.log(blue('exiting...'));
        process.exit();
    }
    if (choice.toLowerCase() === 'q')
        goodBye();
    const command = getCommandByIndex(commands, choice);
    // await copyToClipboard(command)
    let operation = '';
    if (command.index && command.command) {
        // operation = await explainCommand(command)
        createShellHistoryScript(command.command);
        console.log('Press up arrow to run!');
        process.exit(0);
    }
    else {
        switch (operation.toLowerCase()) {
            case 'r':
                {
                    console.log(blue('Running command ...'));
                }
                break;
            case 'x': // Explain
                {
                    // todo: wait until command is ready
                    explainCommand(command);
                }
                break;
            case 'e':
                {
                    console.log('Editing not yet supported');
                    process.exit(0);
                }
                break;
            case 'q':
                goodBye();
                break;
            default:
                console.log('Invalid choice. ', operation.toLowerCase());
                break;
        }
    }
});
main();
