const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
require("dotenv").config

const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const JsonFileAdapter = require('@bot-whatsapp/database/json');
const chat = require("./chatGPT");
const path = require("path");
const fs = require("fs");

// read queries from file
const pathQueries = path.join(__dirname, "messages", "queries.txt");
const promptQueries = fs.readFileSync(pathQueries, "utf-8");


// main flow
const flowMain = addKeyword(['Hola', 'hola', 'hi', 'Hi', 'hello', 'Hello'])
    .addAnswer(
        'Bienvenido al soporte de *ManyToOne*\n\n' +
        '🏠 Página oficial: https://mtocommunity.com\n' +
        '🌐 Comunidad: https://discord.mtocommunity.com\n\n' +
        '👉 ¿En qué puedo ayudarte hoy? Escribe *MENU* para ver las opciones disponibles.'
    );

// menu options
const menu = '👉 Selecciona una opción escribiendo el número:\n\n' +
        '1. 🌐 Quiero saber más sobre la comunidad\n' +
        '2. 🛠️ Tengo problemas para verificarme\n' +
        '3. 🤖 Consultas a la IA\n' +
        '4. 🙋‍♂️ Quiero hablar con un representante.\n'+
        '0. 🚪 Salir';

// queries flow
const flowQueries = addKeyword(EVENTS.ACTION)
    .addAnswer("Hola, ¿qué consulta tienes?",
        {capture:true}, async (ctx, ctxFn ) => {
            const prompt = promptQueries
            const query = ctx.body
            const answer = await chat(prompt, query)
            await ctxFn.flowDynamic(answer.content)
    })

// menu flow
const flowMenu = addKeyword("MENU","menu").addAnswer(
    menu,
    { capture: true },
    async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
        if (!["1", "2", "3", "4", "0"].includes(ctx.body)) {
            return fallBack(
                "Respuesta no válida, por favor selecciona una de las opciones."
            );
        }
        switch (ctx.body) {
            case "1":
                return await flowDynamic('MTO o ManyToOne es una comunidad creada por estudiantes, enfocada en el aprendizaje colaborativo ' +
                                      'y el crecimiento en áreas como desarrollo web, redes, robótica y ciberseguridad. Ofrecemos un entorno de apoyo mutuo ' +
                                      'donde los miembros podemos aprender juntos, compartir conocimientos y enfrentar desafíos en estos campos, la idea es ' +
                                      'facilitar el aprendizaje práctico y obtener experiencia.\n\n' +
                                      '👉 Escribe *MENU* para ver las opciones disponibles.');
            case "2":
                return await flowDynamic('Si estás teniendo problemas para verificarte en Discord, asegúrate de que estás siguiendo correctamente el enlace ' +
                                         'de verificación y de que no hay errores tipográficos en la información que ingresaste. Si el problema persiste, ' +
                                         'intenta reiniciar el proceso. Además, revisa tu carpeta de spam o correo no deseado, ya que a veces los correos ' +
                                         'electrónicos pueden llegar allí. Si tienes otro problema solicita hablar con un representante.\n\n' +
                                         '👉 Escribe *MENU* para ver las opciones disponibles.');
            case "3":
                return gotoFlow(flowQueries); 
            case "4":
                return await flowDynamic('En breve, te conectaremos con un representante que podrá asistirte. ' +
                    'Por favor, mantente atento, ya que te responderán a la mayor brevedad posible. ¡Agradecemos tu paciencia!');             
                    
            case "0":
                return await flowDynamic(
                    "Saliendo... Puedes volver a acceder a este menú escribiendo '*Menu'"
                );
        }
    }
);

// main function to start
const main = async () => {
    const adapterDB = new JsonFileAdapter();
    const adapterFlow = createFlow([flowMain, flowMenu, flowQueries]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();
};


main();