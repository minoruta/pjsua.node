import * as DEBUG from 'debug';
import * as path from 'path';
import * as AmiClient from 'asterisk-ami-client';
import { Pjsua,
PjsuaConfigs,
PlayerConfig,
AccountConfig,
AccountExt,
CallExt,
CallInfo,
} from '../src/Pjsua';


const debug = DEBUG('PJSUA:test');
const LogLevel = Number(process.env.PJSUA_LOGLEVEL || process.env.npm_package_config_test_loglevel || '3');
const Domain = 'asterisk';
const MyID = '6001';
const BadID = 'nouser';
const CalleeLongID = '300';
const CalleeShortID = '301';
const HostAddress = '127.0.0.1';
const MyURI = `sip:${MyID}@${Domain}`;
const BadURI = `sip:${BadID}@${Domain}`;
const CalleeLongURI = `sip:${CalleeLongID}@${HostAddress}`;
const CalleeShortURI = `sip:${CalleeShortID}@${HostAddress}`;
const RegistrarURI = `sip:${HostAddress}:5060`;
const AmiUser = 'asterisk';
const AmiPassword = 'asterisk';
const ShortSound = 'hello';
const LongSound = 'demo-instruct';
const AstMakeAShortCall = `channel originate SIP/${MyID} application playback ${ShortSound}`;
const AstMakeALongCall = `channel originate SIP/${MyID} application playback ${LongSound}`;
const AmiHost = {
    host: HostAddress,
    port: 5038
};
const AmiMakeShortCall = {
    Action: 'Command',
    Command: AstMakeAShortCall
};
const AmiMakeLongCall = {
    Action: 'Command',
    Command: AstMakeALongCall
};

let ua: Pjsua;
let ami: AmiClient;

class Timeout {
    private static readonly DEFAULT_TIMEOUT = 20 * 1000; // msec
    private readonly _saved: number;
    constructor(timeout = Timeout.DEFAULT_TIMEOUT) {
        this._saved = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = timeout;
    }
    end(): void {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = this._saved;
    }
}

function delay(sec: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, sec * 1000));
}

beforeAll( async () => {
    ami = new AmiClient({ reconnect: true, keepAlive: true });
    await ami.connect(AmiUser, AmiPassword, AmiHost);
});

afterAll(() => {
    ami.disconnect();
});

describe('pjsua.node', () => {
    test ('create a pjsua', () => {
        const config: PjsuaConfigs = {
            endpoint: {
                logConfig: {
                    level: LogLevel,
                    consoleLevel: LogLevel
                }
            },
            transport: {
                port: 5062,
            },
            player: {
                player: {
                    filename: path.join(__dirname, 'waves', 'sound.wav')
                },
                recorder: {
                    filename: path.join(__dirname, 'waves', 'call.wav')
                }
            }
        };
        ua = new Pjsua(config);
    });

    test ('make an account with bad id', async () => {
        let noerror = true;
        const config: AccountConfig = {
            idUri: BadURI,
            regConfig: {
                registrarUri: RegistrarURI,
            },
            sipConfig: {
                authCreds: [{
                    scheme: 'digest',
                    realm: Domain,
                    username: BadID,
                    dataType: 0,
                    data: BadID
                }],
            }
        };
        try {
            await ua.makeAccount(config);
        }
        catch (err) {
            expect(err).toMatchSnapshot();
            noerror = false;
        }
        expect(noerror).toBe(false);
    });

    test ('make an account', async () => {
        const config: AccountConfig = {
            idUri: MyURI,
            regConfig: {
                registrarUri: RegistrarURI,
            },
            sipConfig: {
                authCreds: [{
                    scheme: 'digest',
                    realm: Domain,
                    username: MyID,
                    dataType: 0,
                    data: MyID
                }],
            }
        };
        await ua.makeAccount(config);
    });

    test ('wait for call, then reject it', done => {
        ua.account.once('call', (info: CallInfo, call: CallExt) => {
            debug('account.onCall & reject it');
            info.callId = undefined; //  to disable matching test
            expect(info).toMatchSnapshot();
            call.hangup();
            done();
        });
        debug('make an inbound call');
        ami.action(AmiMakeLongCall, true);
    });
    test ('...', async () => {
        await delay(1);
    });

    test ('wait for call, then accept it', done => {
        ua.account.once('call', async (info: CallInfo, call: CallExt) => {
            debug('account.onCall & accept it');
            info.callId = undefined; //  to disable matching test
            expect(info).toMatchSnapshot();
            await ua.account.answer(call);
            done();
        });
        debug('make an inbound call');
        ami.action(AmiMakeLongCall, true);
    });
    test ('calling...', async () => {
        const timer = new Timeout(10 * 1000);
        await delay(5);
        timer.end();
    });
    test ('hang up the inbound call', async () => {
        debug('ua.account.hangup');
        await ua.account.hangup();
    });

    test ('wait for call, accept it, then disconnected from far', done => {
        ua.account.once('call', async (info: CallInfo, call: CallExt) => {
            debug('account.onCall & accept it');
            info.callId = undefined; //  to disable matching test
            expect(info).toMatchSnapshot();
            await ua.account.answer(call);
            done();
        });
        debug('make an inbound call');
        ami.action(AmiMakeShortCall, true);
    });
    test ('wait for disconnection from far', done => {
        debug('wait for disconnection');
        ua.account.call.once('disconnected', () => {
            debug('ua.account.call.disconnected');
            done();
        });
    });

    test (`make an outbound call to ${CalleeLongURI}`, async () => {
        debug('make an outbound call');
        await ua.account.makeCall(CalleeLongURI);
    });
    test ('calling...', async () => {
        await delay(3);
    });
    test ('hang up the outbound call', async () => {
        debug('ua.account.hangup');
        await ua.account.hangup();
    });

    test ('remove account', async () => {
        debug('ua.removeAccount');
        await ua.removeAccount();
    });
    test (`make an outbound call to unregistered account`, async () => {
        debug('make an outbound call to unregistered account');
        let noerror = true;
        try {
            await ua.account.makeCall(CalleeLongURI);
        }
        catch (err) {
            expect(err).toMatchSnapshot();
            noerror = false;
        }
        expect(noerror).toBe(false);
    });
    test ('remove account, again', async () => {
        debug('ua.removeAccount');
        let noerror = true;
        try {
            await ua.removeAccount();
        }
        catch (err) {
            expect(err).toMatchSnapshot();
            noerror = false;
        }
        expect(noerror).toBe(false);
    });
});
