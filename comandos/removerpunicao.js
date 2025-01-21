// Importação de módulos necessários do Discord.js e sistema de arquivos
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const filePath = './dados/punicoes.json';

module.exports = {
  // Configuração do comando /removerpunicao
  data: new SlashCommandBuilder()
    .setName('removerpunicao')
    .setDescription('Remove a punição de um usuário.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuário cuja punição será removida') // Descrição da opção de usuário
        .setRequired(true) // Torna a opção obrigatória
    )
    .addStringOption(option =>
      option.setName('tipo')
        .setDescription('Tipo de punição a ser removida (Castigo ou Banimento)') // Descrição da opção de tipo
        .setRequired(true) // Torna a opção obrigatória
    ),

  // Função principal executada quando o comando é usado
  async execute(interaction) {

    // Previne a interação dupla
    await interaction.deferReply(); 

    // IDs de cargos e canal para logs
    const staffRoleId = '892746407549763584';
    const memberRoleId = '813788487782236240'; 
    const punishedRoleId = '1289775217497083914';
    const bannedRoleId = '1289808875494707292'; 
    const staffLogsChannelId = '1306310681141837904';

    // Verifica se o membro possui permissão (cargo de staff)
    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.editReply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
    }

    // Obtém as opções do comando
    const user = interaction.options.getUser('usuario'); // Usuário alvo
    const tipo = interaction.options.getString('tipo'); // Tipo de punição

    // Verifica se o arquivo de punições existe
    if (!fs.existsSync(filePath)) {
      return interaction.editReply({ content: 'Nenhuma punição encontrada para remoção.', ephemeral: true });
    }

    // Lê e analisa os dados do arquivo de punições
    let existingData = [];
    try {
      existingData = JSON.parse(fs.readFileSync(filePath));
    } catch (err) {
      return interaction.editReply({ content: 'Houve um erro ao ler os dados das punições.', ephemeral: true });
    }

    // Procura a punição correspondente
    const punishmentIndex = existingData.findIndex(p => p.user === user.id && p.tipo === tipo);

    // Verifica se a punição foi encontrada
    if (punishmentIndex === -1) {
      return interaction.editReply({ content: 'Punição não encontrada.', ephemeral: true });
    }

    // Obtém os dados da punição encontrada
    const punishment = existingData[punishmentIndex];
    const member = interaction.guild.members.cache.get(user.id); // Obtém o membro da guilda

    // Verifica se o membro ainda existe no servidor antes de tentar remover cargos
    if (!member) {
      return interaction.editReply({ content: 'O usuário não está mais no servidor.', ephemeral: true });
    }

    // Remove o cargo de punição e adiciona o cargo de membro de volta
    if (tipo === 'Castigo') {
      await member.roles.remove(punishedRoleId); 
      await member.roles.add(memberRoleId); // Adiciona o cargo de "Membro"
    } 
    else if (tipo === 'Banimento') {
      await member.roles.remove(bannedRoleId); 
      await member.roles.add(memberRoleId); // Adiciona o cargo de "Membro"
    }

    // Remove a punição do arquivo de dados
    existingData.splice(punishmentIndex, 1); // Remove a punição do array de dados
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2)); // Salva os dados atualizados no arquivo

    // Gera mensagem de log para o canal de staff logs
    const staffTag = `<@${interaction.user.id}>`; // Menciona o staff que removeu
    const userTag = `<@${user.id}>`; // Menciona o usuário punido

    const logMessage = `# Término de Punição\n**Staff**: ${staffTag}\n**Usuário:** ${userTag}\n**Tipo de Punição:** ${punishment.tipo}\n**Motivo:** ${punishment.motivo}\n**Duração:** ${punishment.tempo}`;
    const logChannel = interaction.guild.channels.cache.get(staffLogsChannelId);
    if (logChannel) logChannel.send(logMessage); // Envia a mensagem de log

    // Envia uma mensagem direta ao usuário informando a remoção da punição
    const dmMessage = `## Punição Removida \n**Motivo da Punição**: ${punishment.motivo}\n**Duração:** ${punishment.tempo}`;
    user.send(dmMessage).catch(() => console.log('Não foi possível enviar DM.')); // Trata erros ao enviar DM

    // Responde ao comando no canal
    interaction.editReply({ content: `Punição de ${user.username} removida com sucesso.`, ephemeral: true });
  }
};
