"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEBUG = require("debug");
const events_1 = require("events");
const sipster_ts_1 = require("sipster.ts");
exports.Media = sipster_ts_1.Media;
const debug = DEBUG('PJSUA:main');
/**
 * An adapter class to Sipster.ts.Call
 * @see {@link https://minoruta.github.io/sipster.ts/classes/call.html|Sipster.ts.Call}
 * @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Call.htm|Pjsip.Call} as well
 * @fires CallExt#dtmf
 * @fires CallExt#disconnected
 */
class CallExt extends events_1.EventEmitter {
    get call() {
        return this._call;
    }
    get account() {
        return this._account;
    }
    get medias() {
        return this._medias;
    }
    set medias(medias) {
        this._medias = medias;
    }
    get player() {
        return this._player;
    }
    get recorder() {
        return this._recorder;
    }
    constructor(account, call, playerConfig) {
        super();
        this._account = account;
        this._call = call;
        if (playerConfig)
            this._playerConfig = playerConfig;
        else
            this._playerConfig = account.playerConfig;
        if (this._playerConfig.player)
            this._player = sipster_ts_1.Sipster.instance()
                .createPlayer(this._playerConfig.player.filename);
        if (this._playerConfig.recorder)
            this._recorder = sipster_ts_1.Sipster.instance()
                .createRecorder(this._playerConfig.recorder.filename);
    }
    onConfirmed() {
        debug('CallExt.onConfirmed');
    }
    onDtmf(digit) {
        debug(`CallExt.onDtmf ${digit}`);
        this.emit('dtmf', digit);
    }
    onDisconnected() {
        debug('CallExt.onDisconnected');
        for (const media of this.medias)
            media.close();
        this.emit('disconnected');
    }
    onMedia(medias) {
        debug(`CallExt.onMedia ${medias.length}`);
        if (medias.length <= 0)
            return;
        if (this.player)
            this.player.startTransmitTo(medias[0]);
        if (this.recorder)
            medias[0].startTransmitTo(this.recorder);
        this.medias = medias;
    }
    /**
     * For incoming calls, this responds to the INVITE with an optional
     * statusCode (defaults to 200) and optional reason phrase.
     */
    answer(statusCode, reason) {
        debug('CallExt.answer');
        this.call.answer(statusCode, reason);
    }
    /**
     * Hangs up the call with an optional statusCode (defaults to 603)
     * and optional reason phrase. This function is different than answering
     * the call with 3xx-6xx response (with answer()), in that this function
     * will hangup the call regardless of the state and role of the call,
     * while answer() only works with incoming calls on EARLY state.
     */
    hangup(statusCode, reason) {
        debug('CallExt.hangup');
        if (this.medias && this.medias.length > 0) {
            if (this.player)
                this.player.stopTransmitTo(this.medias[0]);
            if (this.recorder)
                this.medias[0].stopTransmitTo(this.recorder);
        }
        this.call.hangup(statusCode, reason);
    }
}
exports.CallExt = CallExt;
/**
 * An adapter class to Sipster.ts.Account
 * @see {@link https://minoruta.github.io/sipster.ts/classes/account.html|Sipster.ts.Account}
 * @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Account.htm|Pjsip.Account} as well
 * @fires AccountExt#registering
 * @fires AccountExt#unregistering
 * @fires AccountExt#unregistererd
 * @fires AccountExt#call
 */
class AccountExt extends events_1.EventEmitter {
    get account() {
        return this._account;
    }
    get isCallInProgress() {
        return !!this._call;
    }
    get call() {
        return this._call;
    }
    get playerConfig() {
        return this._playerConfig;
    }
    get state() {
        return this._state;
    }
    set state(state) {
        this._state = state;
    }
    constructor(ua, account, playerConfig) {
        super();
        this._ua = ua;
        this._account = account;
        if (playerConfig)
            this._playerConfig = playerConfig;
        else
            this._playerConfig = ua.playerConfig;
        this._state = "registered";
    }
    onRegistering() {
        debug('AccountExt.onRegistering');
        this.state = 'registering';
        this.emit('registering');
    }
    onRegistered() {
        debug('AccountExt.onRegistered');
        this.state = 'registered';
    }
    onUnregistering() {
        debug('AccountExt.onUnregistering');
        this.state = 'unregistering';
        this.emit('unregistering');
    }
    onUnregistered() {
        debug('AccountExt.onUnregistered');
        this.state = 'unregistererd';
        this.emit('unregistererd');
    }
    onCall(info, call) {
        debug('AccountExt.onCall');
        if (this.isCallInProgress)
            return call.hangup();
        this.emit('call', info, new CallExt(this, call));
    }
    onConfirmed() {
        debug('AccountExt.onConfirmed');
        if (this.isCallInProgress)
            this.call.onConfirmed();
    }
    onConnecting() {
        debug('AccountExt.onConnecting');
    }
    onDisconnected() {
        debug('AccountExt.onDisconnected');
        if (this.isCallInProgress)
            this.call.onDisconnected();
    }
    onMedia(medias) {
        debug(`AccountExt.onMedia ${medias.length}`);
        if (this.isCallInProgress)
            this.call.onMedia(medias);
    }
    onDtmf(digit) {
        debug(`AccountExt.onDtmf ${digit}`);
        if (this.isCallInProgress)
            this.call.onDtmf(digit);
    }
    /**
     * Start a new SIP call to destination.
     */
    makeCall(destination) {
        debug('AccountExt.makeCall');
        return new Promise((resolve, reject) => {
            if (this.isCallInProgress)
                return reject(new Error('call in progress'));
            const call = this.account.makeCall(destination);
            this._call = new CallExt(this, call);
            call.on('dtmf', digit => this.onDtmf(digit));
            call.on('media', medias => this.onMedia(medias));
            call.on('state', state => {
                switch (state) {
                    case 'connecting':
                        return this.onConnecting();
                    case 'confirmed':
                        this.onConfirmed();
                        return resolve(this.call);
                    case 'disconnected':
                        call.removeAllListeners();
                        this.onDisconnected();
                        this._call = undefined;
                        return reject(new Error('disconnected'));
                }
            });
        });
    }
    /**
     * For incoming calls, this responds to the INVITE with an optional
     * statusCode (defaults to 200) and optional reason phrase.
     */
    answer(call, statusCode, reason) {
        debug('AccountExt.answer');
        return new Promise((resolve, reject) => {
            if (this.isCallInProgress)
                return reject(new Error('calling in progress'));
            this._call = call;
            call.call.on('dtmf', digit => this.onDtmf(digit));
            call.call.on('media', medias => this.onMedia(medias));
            call.call.on('state', state => {
                switch (state) {
                    case 'connecting':
                        return this.onConnecting();
                    case 'confirmed':
                        this.onConfirmed();
                        return resolve();
                    case 'disconnected':
                        call.call.removeAllListeners();
                        this.onDisconnected();
                        this._call = undefined;
                        return reject(new Error('disconnected'));
                }
            });
            call.answer(statusCode, reason);
        });
    }
    /**
     * Hangs up the call with an optional statusCode (defaults to 603)
     * and optional reason phrase. This function is different than answering
     * the call with 3xx-6xx response (with answer()), in that this function
     * will hangup the call regardless of the state and role of the call,
     * while answer() only works with incoming calls on EARLY state.
     */
    hangup(statusCode, reason) {
        debug('AccountExt.hangup');
        return new Promise((resolve, reject) => {
            if (!this.isCallInProgress)
                return reject(new Error('not calling'));
            this.call.call.removeAllListeners();
            this.call.call.on('state', (state) => {
                debug('AccountExt.hangup.call', state);
                switch (state) {
                    case 'disconnected':
                        this.call.call.removeAllListeners();
                        this.onDisconnected();
                        this._call = undefined;
                        return resolve();
                }
            });
            this.call.hangup(statusCode, reason);
        });
    }
    /**
     * Update registration or perform unregistration.
     * You only need to call this method if you want to manually update the
     * registration or want to unregister from the server.
     * If renew is false, this will begin the unregistration process.
     * @param renew do 'register' to update expiration when true,
     *              do 'register' with expiration=0 to unregister when false.
     */
    setRegistration(renew) {
        debug('AccountExt.setRegistration', renew);
        this.account.setRegistration(renew);
    }
}
exports.AccountExt = AccountExt;
/**
 * A simple Pjsua2 which provides player to playback and record
 */
class Pjsua {
    get sipster() {
        return this._sipster;
    }
    get account() {
        return this._account;
    }
    get playerConfig() {
        return this._playerConfig;
    }
    constructor(config) {
        this._playerConfig = config.player;
        this._sipster = sipster_ts_1.Sipster.instance(config.endpoint);
        this._transport = new this.sipster.Transport(config.transport);
    }
    onRegistered() {
        debug('Pjsua.onRegistered');
        if (this.account)
            this.account.onRegistered();
    }
    onRegistering() {
        debug('Pjsua.onRegistering');
        if (this.account)
            this.account.onRegistering();
    }
    onUnregistering() {
        debug('Pjsua.onUnregistering');
        if (this.account)
            this.account.onUnregistering();
    }
    onUnregistered() {
        debug('Pjsua.onUnregistered');
        if (this.account)
            this.account.onUnregistered();
    }
    onCall(info, call) {
        debug('Pjsua.onCall');
        if (this.account)
            this.account.onCall(info, call);
    }
    /**
     * Make an account and start registration
     * @param accountConfig     is for making an acount
     * @return registered account.
     */
    makeAccount(accountConfig) {
        debug('Pjsua.makeAccount');
        return new Promise((resolve, reject) => {
            let account;
            const DEFAULT = sipster_ts_1.DEFAULT_ACCOUNT_CONFIG;
            accountConfig = Object.assign(DEFAULT, accountConfig);
            if (this.account) {
                account = this.account.account;
                account.modify(accountConfig);
            }
            else {
                account = new this.sipster.Account(accountConfig);
                this._account = new AccountExt(this, account);
            }
            account.on('state', (active, statusCode) => {
                if (statusCode == 408) {
                    account.removeAllListeners();
                    reject(new Error('timeout'));
                }
            });
            account.on('call', (info, call) => this.onCall(info, call));
            account.on('registering', () => this.onRegistering());
            account.on('unregistering', () => this.onUnregistering());
            account.on('unregistered', () => {
                this.onUnregistered();
                account.removeAllListeners();
                reject(new Error('unregistered'));
            });
            account.once('registered', () => {
                this.onRegistered();
                resolve();
            });
            if (this.sipster.state === 'init')
                this.sipster.start();
        });
    }
    /**
     * Delete an account and the registration
     */
    removeAccount() {
        debug('Pjsua.removeAccount');
        return new Promise((resolve, reject) => {
            if (!this.account)
                return reject(new Error('no account'));
            if (this.account.isCallInProgress)
                return reject(new Error('call in progress'));
            if (this.account.state === 'unregistered')
                return resolve(); // noop
            if (this.account.state !== 'registered')
                return reject(new Error(`not registered, \"${this.account.state}\"`));
            this.account.account.removeAllListeners();
            this.account.account.on('unregistered', () => {
                this.account.account.removeAllListeners();
                this.account.onUnregistered();
                resolve();
            });
            this.account.setRegistration(false);
        });
    }
}
exports.Pjsua = Pjsua;
//# sourceMappingURL=Pjsua.js.map