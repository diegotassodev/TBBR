// Importando as classes e métodos necessários do Discord.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const ms = require('ms');
const filePath = './dados/punicoes.json';

// Definição do comando
module.exports = {
  data: new SlashCommandBuilder()
    .setName('punir')
    .setDescription('Aplica punições a um usuário.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuário a ser punido')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('motivo')
        .setDescription('Motivo da punição')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('tempo')
        .setDescription('Duração da punição')
        .setRequired(true)
    )
    .addAttachmentOption(option =>
      option.setName('prova1')
        .setDescription('Prova 1 (opcional)')
    )
    .addAttachmentOption(option =>
      option.setName('prova2')
        .setDescription('Prova 2 (opcional)')
    )
    .addAttachmentOption(option =>
      option.setName('prova3')
        .setDescription('Prova 3 (opcional)')
    ),

  async execute(interaction) {
    const staffRoleId = '892746407549763584';
    const memberRoleId = '813788487782236240';
    const punishedRoleId = '1289775217497083914';
    const bannedRoleId = '1289808875494707292';
    const staffLogsChannelId = '1306310681141837904';

    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({ content: 'Você não tem permissão para usar este comando.', ephemeral: true });
    }

    const user = interaction.options.getUser('usuario');
    const motivo = interaction.options.getString('motivo');
    const tempo = interaction.options.getString('tempo');
    const provas = [
      interaction.options.getAttachment('prova1'),
      interaction.options.getAttachment('prova2'),
      interaction.options.getAttachment('prova3')
    ].filter(Boolean);

    const tempoEmMilissegundos = ms(tempo);
    if (!tempoEmMilissegundos) {
      return interaction.reply({
        content: 'O tempo fornecido é inválido. Use um formato válido (exemplo: 1h, 30m, 2d).',
        ephemeral: true
      });
    }

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('castigar')
          .setLabel('Castigar')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('banir')
          .setLabel('Banir')
          .setStyle(ButtonStyle.Danger)
      );

    await interaction.reply({
      content: `Escolha a punição para ${user.username}.`,
      components: [row],
      ephemeral: true
    });

    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60000
    });

    collector.on('collect', async i => {
      const member = interaction.guild.members.cache.get(user.id);

      if (!member) {
        logPunishment('Pendente', interaction, user, motivo, tempo, provas, staffLogsChannelId, tempoEmMilissegundos);
        await i.update({
          content: `O usuário ${user.username} não está no servidor. A punição foi registrada e será aplicada quando ele entrar.`,
          components: []
        });
      } else if (i.customId === 'castigar') {
        await member.roles.remove(memberRoleId);
        await member.roles.add(punishedRoleId);
        logPunishment('Castigo', interaction, user, motivo, tempo, provas, staffLogsChannelId, tempoEmMilissegundos);
      } else if (i.customId === 'banir') {
        await member.roles.remove(memberRoleId);
        await member.roles.add(bannedRoleId);
        logPunishment('Banimento', interaction, user, motivo, tempo, provas, staffLogsChannelId, tempoEmMilissegundos);
      }

      await i.update({
        content: `Punição aplicada ao usuário ${user.username}.`,
        components: []
      });

      // Finaliza o coletor para evitar interações adicionais
      collector.stop();
    });

    // Listener para quando o coletor expira sem interação
    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        interaction.editReply({
          content: 'Tempo para selecionar a punição expirou.',
          components: []
        });
      }
    });
  }
};

function logPunishment(tipo, interaction, user, motivo, tempo, provas, staffLogsChannelId, tempoEmMilissegundos) {
  const punishmentData = {
    user: user.id,
    staff: interaction.user.id,
    tipo,
    motivo,
    tempo,
    dataDeTermino: new Date(Date.now() + tempoEmMilissegundos).toISOString(),
    provas: provas.map(p => p.url),
    data: new Date().toISOString()
  };

  let existingData = [];
  if (fs.existsSync(filePath)) {
    const rawData = fs.readFileSync(filePath, 'utf8');
    if (rawData.trim()) {
      existingData = JSON.parse(rawData);
    }
  }

  existingData.push(punishmentData);
  fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));

  const logChannel = interaction.guild.channels.cache.get(staffLogsChannelId);
  if (logChannel) {
    const logMessage = `# ${tipo}\n**Staff:** <@${interaction.user.id}>\n**Usuário:** <@${user.id}>\n**Duração:** ${tempo}\n**Motivo:** ${motivo}`;
    logChannel.send(logMessage);
  }

  user.send(`Você recebeu uma punição do tipo **${tipo}**.\n**Motivo:** ${motivo}\n**Duração:** ${tempo}`).catch(() => {
    console.log(`Não foi possível enviar mensagem privada para o usuário ${user.username}.`);
  });
}
