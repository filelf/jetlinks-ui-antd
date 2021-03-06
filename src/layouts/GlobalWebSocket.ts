import { getAccessToken } from "@/utils/authority";
import { Observable } from "rxjs";
import { } from "rxjs/operators";
import { message, notification } from "antd";

let ws: WebSocket | undefined;
let count = 0;
const subs = {};
const initWebSocket = () => {
    const wsUrl = `ws://${document.location.host}/jetlinks/messaging/${getAccessToken()}`;
    if (!ws && count < 5) {
        try {
            count += 1;
            ws = new WebSocket(wsUrl);
            ws.onclose = () => {
                ws = undefined;
                setTimeout(initWebSocket, 5000 * count);
            }
            ws.onmessage = (msg: any) => {

                const data = JSON.parse(msg.data);
                if (data.type === 'error') {
                    notification.error({ key: 'wserr', message: data.message });
                }
                if (subs[data.requestId]) {
                    if (data.type === 'complete') {
                        subs[data.requestId].forEach((element: any) => {
                            element.complete();
                        });;
                    } else if (data.type === 'result') {
                        subs[data.requestId].forEach((element: any) => {
                            element.next(data)
                        });;
                    }
                }
            }
        } catch (error) {
            setTimeout(initWebSocket, 5000 * count);
        }
    }
    return ws;
}

const getWebsocket = (id: string, topic: string, parameter: any): Observable<any> =>
    new Observable<any>(subscriber => {
        if (!subs[id]) {
            subs[id] = [];
        }
        subs[id].push({
            next: (val: any) => {
                subscriber.next(val);
            },
            complete: () => {
                subscriber.complete();
            }
        });
        const msg = JSON.stringify({ id, topic, parameter, type: 'sub' });
        const thisWs = ws || initWebSocket();
        try {
            thisWs!.send(msg);
        } catch (error) {
            message.error({ key: 'ws', content: 'websocket服务连接失败' });
        }
        return () => {
            const unsub = JSON.stringify({ id, type: "unsub" });
            delete subs[id];
            thisWs!.send(unsub)
        }
    });
export { getWebsocket, initWebSocket };