### ts alias设置

可以设置

    "compilerOptions": {
       "baseUrl": "./src",
       "paths": {
            "@/*": ["*"]
       }
    }

但不要直接在tsconfig.json里设置，用craco运行时会给删掉，可以保存成path.json用extends: './path.json'引入。