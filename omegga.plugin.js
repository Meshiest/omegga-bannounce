const GENERIC_LINE_REGEX = /^(\[(?<date>\d{4}\.\d\d.\d\d-\d\d.\d\d.\d\d:\d{3})\]\[\s*(?<counter>\d+)\])?(?<generator>\w+): (?<data>.+)$/;

module.exports = class Plugin {
  constructor(omegga, config, store) {
    this.omegga = omegga;
    this.config = config;
    this.store = store;
  }
  async init() {
    let joiningData = null;
    const cooldowns = {};
    const canChat = p => p.isHost() || p.getRoles().includes(this.config['whisper-role']);

    Omegga.on('line', line => {
      const match = line.match(GENERIC_LINE_REGEX);
      if (!match) return;
      if (match.groups.generator === 'LogServerList') {
        if (match.groups.data.startsWith('Auth payload valid. Result:')) {
          joiningData = {};
        } else if (!joiningData) {
          return;
        } else if (match.groups.data.startsWith('UserName: ')) {
          joiningData.name = match.groups.data.slice(10);
        } else if (match.groups.data.startsWith('UserId: ')) {
          joiningData.id = match.groups.data.slice(8);
        } else if (match.groups.data.startsWith('HandleId: ')) {
          // ignoring handle
        } else {
          // ignore the join
          joiningData = null;
        }
      } else if (match.groups.generator === 'LogSpawn' && joiningData && match.groups.data.startsWith('Warning: Login failed: You are banned from this server.')) {
        if (this.config['ignored-players'].find(p => p.id === joiningData.id)) return;
        if (cooldowns[joiningData.id] && cooldowns[joiningData.id] + 15000 > Date.now()) return;
        cooldowns[joiningData.id] = Date.now();
        const message = `"<color=\\"6666ff\\">Banned player <b><link=\\"https://brickadia.com/users/${joiningData.id}\\">${joiningData.name}</></>attempted to join the game.</>"`;
        if (this.config.broadcast)
          Omegga.broadcast(message);
        else {
          for (const p of Omegga.players) {
            if (canChat(p)) {
              Omegga.whisper(p, message);
            }
          }
        }
        joiningData = null;
      } else {
        joiningData = null;
      }
    })
  }

  async stop() {

  }
}