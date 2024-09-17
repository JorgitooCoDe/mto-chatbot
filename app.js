const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
require("dotenv").config();

const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const JsonFileAdapter = require('@bot-whatsapp/database/json');
const chat = require("./chatGPT");
const path = require("path");
const fs = require("fs");

const pathQueries = path.join(__dirname, "messages", "queries.txt");
const promptQueries = fs.readFileSync(pathQueries, "utf-8");

const state = new Map();

const flowMain = addKeyword(['Hola', 'hola', 'hi', 'Hi', 'hello', 'Hello'])
    .addAnswer(
        'Bienvenido al soporte de *ManyToOne*\n\n' +
        '🏠 Página oficial: https://mtocommunity.com\n' +
        '🌐 Comunidad: https://discord.mtocommunity.com\n\n' +
        '👉 ¿En qué puedo ayudarte hoy? Escribe *MENU* para ver las opciones disponibles.'
    );

const menu = '👉 Selecciona una opción escribiendo el número:\n\n' +
    '1. 🌐 Quiero saber más sobre la comunidad\n' +
    '2. 🛠️ Tengo problemas para verificarme\n' +
    '3. 🤖 Consultas a la IA\n' +
    '4. 🙋‍♂️ Quiero hablar con un representante.\n' +
    '0. 🚪 Salir';

const flowQueries = addKeyword(EVENTS.ACTION)
    .addAnswer("Hola, ¿qué consulta tienes?", { capture: true }, async (ctx, ctxFn) => {
        const userState = state.get(ctx.from);
        if (userState && userState.inConversationWithRep) {
            await ctxFn.flowDynamic("Ya estás en conversación con un representante.");
            return ctxFn.endFlow();
        }

        const prompt = promptQueries;
        const query = ctx.body;
        const answer = await chat(prompt, query);
        await ctxFn.flowDynamic(answer.content);
    });

const flowMenu = addKeyword("MENU", "menu").addAnswer(
    menu,
    { capture: true },
    async (ctx, { gotoFlow, fallBack, flowDynamic, endFlow }) => {
        const userState = state.get(ctx.from);
        
        if (userState && userState.inConversationWithRep) {
            await flowDynamic("Ya estás en conversación con un representante.");
            return endFlow();
        }
        
        if (!["1", "2", "3", "4", "0"].includes(ctx.body)) {
            return fallBack("Respuesta no válida, por favor selecciona una de las opciones.");
        }

        switch (ctx.body) {
            case "1":
                return await flowDynamic(
                    'MTO o ManyToOne es una comunidad creada por estudiantes, ' +
                    '👉 Escribe *MENU* para ver las opciones disponibles.'
                );
            case "2":
                return await flowDynamic(
                    'Si estás teniendo problemas para verificarte en Discord, ... ' +
                    '👉 Escribe *MENU* para ver las opciones disponibles.'
                );
            case "3":
                return gotoFlow(flowQueries);
            case "4":
                state.set(ctx.from, { inConversationWithRep: true });
                await flowDynamic(
                    'En breve, te conectaremos con un representante. ' +
                    'Por favor, mantente atento, ya que te responderán a la mayor brevedad posible.'
                );
                return endFlow();
            case "0":
                return await flowDynamic(
                    "Saliendo... Puedes volver a acceder a este menú escribiendo '*Menu'"
                );
        }
    }
);


async function handleIncomingMessage(ctx) {
    const userState = state.get(ctx.from);

    if (userState && userState.inConversationWithRep) {
        console.log(`Usuario ${ctx.from} está en conversación con un representante. No se procesará el mensaje.`);
        return;
    }

    console.log(`Mensaje recibido del usuario ${ctx.from}: ${ctx.body}`);
}

const main = async () => {
    const adapterDB = new JsonFileAdapter();
    const adapterFlow = createFlow([flowMain, flowMenu, flowQueries]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
        onMessage: handleIncomingMessage
    });

    QRPortalWeb();
};

main();
