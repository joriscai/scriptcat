
export type ListenCallback = (msg: any, port: chrome.runtime.Port) => Promise<any> | any;

export type MessageCallback = (body: any, sendResponse: (response?: any) => void, sender?: chrome.runtime.MessageSender) => Promise<any> | any;

const topicMap = new Map<string, Map<ListenCallback, ListenCallback>>();
chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
    const val = topicMap.get(port.name);
    if (!val) {
        return;
    }
    port.onMessage.addListener((msg, port) => {
        val?.forEach((func) => {
            const ret = func(msg, port);
            if (ret) {
                if (ret instanceof Promise) {
                    void ret.then(result => {
                        port.postMessage(result);
                    });
                } else {
                    port.postMessage(ret);
                }
            }
        });
    });
});

// 在扩展页面之间的消息传递
export class MsgCenter {

    public static listener(topic: string, callback: ListenCallback) {
        let val = topicMap.get(topic);
        if (!val) {
            val = new Map();
            topicMap.set(topic, val);
        }
        val.set(callback, callback);
    }

    // 监听msg操作的只能有一个
    public static listenerMessage(topic: string, callback: MessageCallback) {
        const val = new Map();
        topicMap.set(topic, val);
        val.set(callback, (msg: any, port: chrome.runtime.Port) => {
            callback(msg, (resp) => { port.postMessage(resp) }, port.sender);
        });
    }

    public static trigger(topic: string, msg?: any) {
        const val = topicMap.get(topic);
        val && val.forEach(func => {
            func(msg, <chrome.runtime.Port>{})
        });
    }

    public static removeListener(topic: string, callback: ListenCallback) {
        const val = topicMap.get(topic);
        if (val) {
            val.delete(callback);
            if (!val.size) {
                topicMap.delete(topic);
            }
        }
    }

    public static removeListenerAll(topic: string) {
        const val = topicMap.get(topic);
        if (val) {
            topicMap.delete(topic);
        }
    }

    public static connect(topic: string, msg?: any): onRecv {
        const port = chrome.runtime.connect({
            name: topic,
        });
        if (msg) {
            port.postMessage(msg);
        }
        return new onRecv(port);
    }

    // 仅发送消息,由于可能有sync的方法,使用长连接的方法实现
    public static sendMessage(topic: string, body?: any, respondCallback?: (respond: any) => void) {
        const port = chrome.runtime.connect({
            name: topic,
        });
        port.postMessage(body);
        port.onMessage.addListener(msg => {
            respondCallback && respondCallback(msg);
            port.disconnect();
        })
    }

}

export class onRecv {

    protected callback!: ListenCallback
    protected port: chrome.runtime.Port;

    constructor(port: chrome.runtime.Port) {
        this.port = port;
        this.port.onMessage.addListener((msg, port) => {
            if (!msg) {
                return;
            }
            const ret = this.callback(msg, port);
            if (ret) {
                if (ret instanceof Promise) {
                    void ret.then(result => {
                        port.postMessage(result);
                    });
                } else {
                    port.postMessage(ret);
                }
            }
        });
    }

    public addListener(callback: ListenCallback) {
        this.callback = callback;
    }

}