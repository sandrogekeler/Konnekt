export namespace models {
	
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

}

