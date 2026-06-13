export namespace models {
	
	export class AppSettings {
	    theme: string;
	    accentColor: string;
	    autoStartActiveServer: boolean;
	    confirmBeforeStop: boolean;
	    consoleBufferLines: number;
	    consoleTimestamps: boolean;
	    notifyOnCrash: boolean;
	    notifyOnJoin: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.accentColor = source["accentColor"];
	        this.autoStartActiveServer = source["autoStartActiveServer"];
	        this.confirmBeforeStop = source["confirmBeforeStop"];
	        this.consoleBufferLines = source["consoleBufferLines"];
	        this.consoleTimestamps = source["consoleTimestamps"];
	        this.notifyOnCrash = source["notifyOnCrash"];
	        this.notifyOnJoin = source["notifyOnJoin"];
	    }
	}
	export class LayoutPreset {
	    name: string;
	    layout: string;
	
	    static createFrom(source: any = {}) {
	        return new LayoutPreset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.layout = source["layout"];
	    }
	}
	export class Player {
	    name: string;
	    ping: number;
	
	    static createFrom(source: any = {}) {
	        return new Player(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.ping = source["ping"];
	    }
	}
	export class ServerConfig {
	    id: string;
	    name: string;
	    jarPath: string;
	    jvmArgs: string[];
	    workingDir: string;
	
	    static createFrom(source: any = {}) {
	        return new ServerConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.jarPath = source["jarPath"];
	        this.jvmArgs = source["jvmArgs"];
	        this.workingDir = source["workingDir"];
	    }
	}
	export class ServerStatus {
	    running: boolean;
	    uptime: string;
	    players: number;
	    maxPlayers: number;
	    tps: number;
	    ramUsed: number;
	    ramTotal: number;
	
	    static createFrom(source: any = {}) {
	        return new ServerStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.running = source["running"];
	        this.uptime = source["uptime"];
	        this.players = source["players"];
	        this.maxPlayers = source["maxPlayers"];
	        this.tps = source["tps"];
	        this.ramUsed = source["ramUsed"];
	        this.ramTotal = source["ramTotal"];
	    }
	}
	export class StatsSnapshot {
	    timestamp: number;
	    tps: number;
	    ramUsedMB: number;
	    ramTotalMB: number;
	    cpuPercent: number;
	    players: number;
	
	    static createFrom(source: any = {}) {
	        return new StatsSnapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timestamp = source["timestamp"];
	        this.tps = source["tps"];
	        this.ramUsedMB = source["ramUsedMB"];
	        this.ramTotalMB = source["ramTotalMB"];
	        this.cpuPercent = source["cpuPercent"];
	        this.players = source["players"];
	    }
	}

}

