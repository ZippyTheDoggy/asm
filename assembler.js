let type = (item) => {
    if(/^[0-9]+$/.test(item)) return "number";
    if(/^[a-zA-z][a-zA-Z0-9]*$/.test(item)) return "register";
    return "unknown";
}

class OutputStream {
    constructor() {
        this.output = [];
        this.errors = [];
    }
    error(message) {
        this.errors.push(message);
    }
    log(message) {
        this.output.push(message);
    }
    shouldCompile() {
        return this.errors.length == 0;
    }
}

let commaStringSplit = (text) => {
    let regex = /(?!\B"[^"]*),(?![^"]*"\B)/gm;
    let match;
    let items = [];
    while((match = regex.exec(text)) !== null) {
        items.push(match && match.index);
    }
    let last = 0;
    let arr = [...items];
    arr = arr.map(i => {
        let s = text.slice(last, i);
        last = i + 1;
        return s;
    });
    arr = [...arr, text.slice(last, text.length)];
    return arr;
};

class InstructionSet {
    constructor() {
        this.instructions = {};
    }
    add(instruction, callbacks) {
        this.instructions[instruction] = callbacks;
    }
    get(instruction) {
        return this.instructions[instruction];
    }
}

let Instructions = new InstructionSet();
Instructions.add("mov", {
    [["register", "number"]]: (context, register, number) => {
        context.registers[register] = parseInt(number);
    },
    [["register", "register"]]: (context, register, register2) => {
        context.registers[register] = context.registers[register2];
    }
});
Instructions.add("push", {
    [["number"]]: (context, number) => {
        context.stack.push(parseInt(number));
    },
    [["register"]]: (context, register) => {
        context.stack.push(context.registers[register]);
    }
});
Instructions.add("pop", {
    [["register"]]: (context, register) => {
        context.registers[register] = context.stack.pop();
    }
});
Instructions.add("add", {
    [["register", "number"]]: (context, register, number) => {
        context.registers[register] += parseInt(number);
    },
    [["register", "register"]]: (context, register, register2) => {
        context.registers[register] += parseInt(context.registers[register2]);
    }
});
Instructions.add("sub", {
    [["register", "number"]]: (context, register, number) => {
        context.registers[register] -= parseInt(number);
    },
    [["register", "register"]]: (context, register, register2) => {
        context.registers[register] -= parseInt(context.registers[register2]);
    }
})
Instructions.add("print", {
    [["register"]]: (context, register) => {
        context.output.log(context.registers[register]);
    },
    [["number"]]: (context, number) => {
        context.output.log(number);
    }
});

class Context {
    constructor(code) {
        this.output = new OutputStream();
        this.code = code;
        this.stack = [];
        this.registers = {};
        this.instructions = Instructions;
    }
    ensureRegister(register) {
        return this.registers[register] != null && this.registers[register] != undefined;
    }
    use(line) {
        let instruction = line.split(" ")[0];
        let args = commaStringSplit(line.split(" ").slice(1).join(" "));
        args = args.map(e => e.trim());
        
        if(this.instructions.get(instruction)) {
            let types = [];
            args.forEach(arg => types.push(type(arg)));
            if(types in this.instructions.get(instruction)) {
                this.instructions.get(instruction)[types](this, ...args);
            }
        } else this.output.error(`Unknown instruction "${instruction}"`);
    }
    print() {
        return `stack: [\n${[...this.stack].map(e => "\t" + e)}\n], \nregisters: {\n${Object.entries(this.registers).map(k => `\t${(""+k+"").split(",")[0]}: ${(""+k+"").split(",").slice(1).join(",")}`)}\n}`;
    }
}
let context = new Context();
let code = `
mov m1, 5
mov m2, 6
`
let lines = code.trim().split("\n");
for(let line of lines) {
    context.use(line);
}

if(context.output.shouldCompile()) {
    console.log(context.print());
} else {
    for(let error of context.output.errors) {
        console.log(`Error: ${error}`)
    }
}
console.log(`----------------------------------------`);
for(let log of context.output.output) {
    console.log(`Info: ${log}`);
}
