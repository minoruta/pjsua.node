import * as DEBUG from 'debug';
import { EventEmitter } from 'events';
import { Sipster,
TransportConfig,
EpConfig,
AccountConfig,
Call,
CallInfo,
Account,
AudioMedia,
AudioMediaPlayer,
AudioMediaRecorder,
Media,
makeAccountConfig,
} from 'sipster.ts';

export {
TransportConfig,
EpConfig,
AccountConfig,
CallInfo,
Media,
};

const debug = DEBUG('PJSUA:main');

export interface PlayerConfig {
    player?: {
        /** filename to play while calling */
        filename: string;
    };
    recorder?: {
        /** filename to record while calling */
        filename: string;
    };
}

export interface PjsuaConfigs {
    /**
     * @see {@link https://minoruta.github.io/sipster.ts/interfaces/transportconfig.html|Sipster.ts.TransportConfig}
     * @see {@link http://www.pjsip.org/pjsip/docs/html/structpj_1_1TransportConfig.htm|Pjsip.TransportConfig}
     */
    transport: TransportConfig;
    /**
     * @see {@link https://minoruta.github.io/sipster.ts/interfaces/epconfig.html|Sipster.ts.EpConfig}
     * @see {@link http://www.pjsip.org/pjsip/docs/html/structpj_1_1EpConfig.htm|Pjsip.EpConfig}
     */
    endpoint: EpConfig;
    player: PlayerConfig;
}

/**
 * An adapter class to Sipster.ts.Call
 * @see {@link https://minoruta.github.io/sipster.ts/classes/call.html|Sipster.ts.Call}
 * @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Call.htm|Pjsip.Call} as well
 * @fires CallExt#dtmf
 * @fires CallExt#disconnected
 */
export class CallExt extends EventEmitter {
    private readonly _call: Call;
    private readonly _account: AccountExt;
    private readonly _playerConfig: PlayerConfig;
    private readonly _player?: AudioMediaPlayer;
    private readonly _recorder?: AudioMediaRecorder;
    private _medias?: Media[];

    get call(): Call {
        return this._call;
    }

    protected get account(): AccountExt {
        return this._account;
    }

    get medias(): Media[] {
        return this._medias;
    }
    set medias(medias: Media[]) {
        this._medias = medias;
    }

    protected get player(): AudioMediaPlayer {
        return this._player;
    }

    protected get recorder(): AudioMediaRecorder {
        return this._recorder;
    }

    constructor(account: AccountExt, call: Call, playerConfig?: PlayerConfig) {
        super();
        this._account = account;
        this._call = call;

        if (playerConfig)
            this._playerConfig = playerConfig;
        else
            this._playerConfig = account.playerConfig;

        if (this._playerConfig.player)
            this._player = Sipster.instance()
                .createPlayer(this._playerConfig.player.filename);
        if (this._playerConfig.recorder)
            this._recorder = Sipster.instance()
                .createRecorder(this._playerConfig.recorder.filename);
    }

    onConfirmed(): void {
        debug('CallExt.onConfirmed');
    }
    onDtmf(digit: string): void {
        debug(`CallExt.onDtmf ${digit}`);
        this.emit('dtmf', digit);
    }
    onDisconnected(): void {
        debug('CallExt.onDisconnected');
        for (const media of this.medias)
            media.close();
        this.emit('disconnected');
    }
    onMedia(medias: Media[]): void {
        debug(`CallExt.onMedia ${medias.length}`);
        if (medias.length <= 0)
            return;
        if (this.player)
            this.player.startTransmitTo(medias[0]);
        if (this.recorder)
            (medias[0] as AudioMedia).startTransmitTo(this.recorder);
        this.medias = medias;
    }

    /**
     * For incoming calls, this responds to the INVITE with an optional
     * statusCode (defaults to 200) and optional reason phrase.
     */
    answer(statusCode?: number, reason?: string): void {
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
    hangup(statusCode?: number, reason?: string): void {
        debug('CallExt.hangup');
        if (this.medias && this.medias.length > 0) {
            if (this.player)
                this.player.stopTransmitTo(this.medias[0]);
            if (this.recorder)
                (this.medias[0] as AudioMedia).stopTransmitTo(this.recorder);
        }
        this.call.hangup(statusCode, reason);
    }
}

/**
 * An adapter class to Sipster.ts.Account
 * @see {@link https://minoruta.github.io/sipster.ts/classes/account.html|Sipster.ts.Account}
 * @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Account.htm|Pjsip.Account} as well
 * @fires AccountExt#registering
 * @fires AccountExt#unregistering
 * @fires AccountExt#unregistererd
 * @fires AccountExt#call
 */
export class AccountExt extends EventEmitter {

    private readonly _ua: Pjsua;
    private readonly _account: Account;
    private readonly _playerConfig: PlayerConfig;
    private _state: string;

    private _call?: CallExt;

    get account(): Account {
        return this._account;
    }

    get isCallInProgress(): boolean {
        return !!this._call;
    }
    get call(): CallExt {
        return this._call;
    }

    get playerConfig(): PlayerConfig {
        return this._playerConfig;
    }

    get state(): string {
        return this._state;
    }
    set state(state: string) {
        this._state = state;
    }

    constructor(ua: Pjsua, account: Account, playerConfig?: PlayerConfig) {
        super();
        this._ua = ua;
        this._account = account;
        if (playerConfig)
            this._playerConfig = playerConfig;
        else
            this._playerConfig = ua.playerConfig;
        this._state = "registered";
    }

    onRegistering(): void {
        debug('AccountExt.onRegistering');
        this.state = 'registering';
        this.emit('registering');
    }
    onRegistered(): void {
        debug('AccountExt.onRegistered');
        this.state = 'registered';
    }
    onUnregistering(): void {
        debug('AccountExt.onUnregistering');
        this.state = 'unregistering';
        this.emit('unregistering');
    }
    onUnregistered(): void {
        debug('AccountExt.onUnregistered');
        this.state = 'unregistererd';
        this.emit('unregistererd');
    }
    onCall(info: CallInfo, call: Call): void {
        debug('AccountExt.onCall');
        if (this.isCallInProgress)
            return call.hangup();
        this.emit('call', info, new CallExt(this, call));
    }

    protected onConfirmed(): void {
        debug('AccountExt.onConfirmed');
        if (this.isCallInProgress)
            this.call.onConfirmed();
    }
    protected onConnecting(): void {
        debug('AccountExt.onConnecting');
    }
    protected onDisconnected(): void {
        debug('AccountExt.onDisconnected');
        if (this.isCallInProgress)
            this.call.onDisconnected();
    }
    protected onMedia(medias: Media[]) {
        debug(`AccountExt.onMedia ${medias.length}`);
        if (this.isCallInProgress)
            this.call.onMedia(medias);
    }
    protected onDtmf(digit: string) {
        debug(`AccountExt.onDtmf ${digit}`);
        if (this.isCallInProgress)
            this.call.onDtmf(digit);
    }

    /**
     * Start a new SIP call to destination.
     * @return when the outbound call has been connected.
     * @reject {Error}  not registered
     * @reject {Error}  call in progress
     * @reject {Error}  disconnected
     */
    makeCall(destination: string): Promise<CallExt> {
        debug('AccountExt.makeCall');
        return new Promise((resolve, reject) => {
            if (this.state !== 'registered')
                return reject(new Error('not registered'));
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
     * @return when the inbound call has been confirmed.
     * @reject {Error}  calling in progress
     * @reject {Error}  disconnected
     */
    answer(call: CallExt, statusCode?: number, reason?: string): Promise<void> {
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
     * @return when the outstanding call has been disconnected.
     * @reject {Error}  not calling
     */
    hangup(statusCode?: number, reason?: string): Promise<void> {
        debug('AccountExt.hangup');
        return new Promise((resolve, reject) => {
            if (!this.isCallInProgress)
                return reject(new Error('not calling'));

            this.call.call.removeAllListeners();
            this.call.call.on('state', (state: string) => {
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
    setRegistration(renew: boolean): void {
        debug('AccountExt.setRegistration', renew);
        this.account.setRegistration(renew);
    }
}

/**
 * A simple Pjsua2 which provides player to playback and record
 */
export class Pjsua {
    private readonly _sipster: Sipster;
    private readonly _playerConfig: PlayerConfig;
    private readonly _transport: Transport;
    private _account?: AccountExt;

    protected get sipster(): Sipster {
        return this._sipster;
    }

    get account(): AccountExt {
        return this._account;
    }

    get playerConfig(): PlayerConfig {
        return this._playerConfig;
    }

    constructor(config: PjsuaConfigs) {
        this._playerConfig = config.player;
        this._sipster = Sipster.instance(config.endpoint);
        this._transport = new this.sipster.Transport(config.transport);
    }

    protected onRegistered(): void {
        debug('Pjsua.onRegistered');
        if (this.account)
            this.account.onRegistered();
    }
    protected onRegistering(): void {
        debug('Pjsua.onRegistering');
        if (this.account)
            this.account.onRegistering();
    }
    protected onUnregistering(): void {
        debug('Pjsua.onUnregistering');
        if (this.account)
            this.account.onUnregistering();
    }
    protected onUnregistered(): void {
        debug('Pjsua.onUnregistered');
        if (this.account)
            this.account.onUnregistered();
    }
    protected onCall(info: CallInfo, call: Call): void {
        debug('Pjsua.onCall');
        if (this.account)
            this.account.onCall(info, call);
    }

    /**
     * Make an account and start registration
     * @param accountConfig     is for making an acount
     * @return when the outstanding account has been registered.
     * @reject {Error}  timeout
     * @reject {Error}  unregistered
     */
    makeAccount(accountConfig: AccountConfig): Promise<void> {
        debug('Pjsua.makeAccount');
        return new Promise<void>((resolve, reject) => {
            let account: Account;
            accountConfig.sipConfig.transport = this._transport;
            accountConfig = makeAccountConfig(accountConfig);
            if (this.account) {
                account = this.account.account;
                account.modify(accountConfig);
            }
            else {
                account = new this.sipster.Account(accountConfig);
                this._account = new AccountExt(this, account);
            }

            account.on('state', (active: boolean, statusCode: number) => {
                if (statusCode == 408) {
                    account.removeAllListeners();
                    reject(new Error('timeout'));
                }
            });
            account.on('call', (info: CallInfo, call: Call) => this.onCall(info, call));
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
     * @return when the current account has been unregistered.
     * @reject {Error}  no account
     * @reject {Error}  call in progress
     * @reject {Error}  not registered
     */
    removeAccount(): Promise<void> {
        debug('Pjsua.removeAccount');
        return new Promise<void>((resolve, reject) => {
            if (!this.account)
                return reject(new Error('no account'));
            if (this.account.isCallInProgress)
                return reject(new Error('call in progress'));
            if (this.account.state === 'unregistered')
                return resolve();   // noop
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
