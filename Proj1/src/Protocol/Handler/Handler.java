package Protocol.Handler;

import Protocol.Message.Message;

public abstract class Handler implements Runnable{

    public String channel;
    public int peerID;
    public Message msg;

    public Handler() {}
    public Handler(int _peerID) { peerID = _peerID; }
    public abstract void handle(Message m);

    @Override
    public void run() { handle(this.msg); }
}
