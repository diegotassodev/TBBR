// Importação das dependências necessárias
const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { verificarpunicoes } = require('./funcoes/verificarpunicoes'); // Importa função para verificar punições
const { iniciarSincronizacao } = require('./funcoes/linkarcargos'); // Importa função para sincronizar cargos

// Configuração de variáveis de ambiente
dotenv.config();
const { TOKEN, CLIENT_ID, GUILD_ID } = process.env; // Define variáveis do ambiente

// Caminho para a pasta de comandos e filtragem dos arquivos de comandos
const commandsPath = path.join(__dirname, 'comandos');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Inicialização do cliente Discord com intenções específicas
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Eventos gerais de guildas
    GatewayIntentBits.GuildMembers, // Eventos relacionados a membros
    GatewayIntentBits.GuildVoiceStates, // Eventos de estados de voz
  ],
});

// Criação de uma coleção para armazenar os comandos
client.commands = new Collection();

// Registro dos comandos encontrados na pasta "comandos"
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file); // Caminho completo do arquivo
  const command = require(filePath); // Importa o comando

  // Verifica se o comando possui as propriedades necessárias
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command); // Adiciona o comando à coleção
  } else {
    console.log(`Esse comando em ${filePath} está com "data" ou "execute" ausentes.`);
  }
}

// Evento acionado ao receber interações (ex: comandos slash)
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return; // Ignora interações que não sejam comandos slash

  const command = interaction.client.commands.get(interaction.commandName); // Obtém o comando pelo nome

  // Verifica se o comando existe
  if (!command) {
    console.error('Comando não encontrado');
    return;
  }

  // Executa o comando e trata possíveis erros
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Erro ao executar comando:', error);
    await interaction.reply({
      content: 'Houve um erro ao executar esse comando.',
      ephemeral: true, // Resposta visível apenas para o autor
    });
  }
});

// Logando o bot e configurando funções de inicialização
client.login(TOKEN);
client.once(Events.ClientReady, async readyClient => {
  console.log(`Bot conectado como ${readyClient.user.tag}`); // Log ao conectar com sucesso

  // Inicializa sincronização de cargos
  iniciarSincronizacao(client);

  // Verifica punições em todas as guildas
  client.guilds.cache.forEach(guild => {
    verificarpunicoes(guild); // Chama a função de verificar punições
  });
});
