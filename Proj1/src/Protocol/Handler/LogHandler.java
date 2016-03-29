package Protocol.Handler;

import Protocol.Message.Message;
import Utils.Log;

public class LogHandler extends Handler{

    @Override
    public void handle(Message m) {
        Log.messageBrief(m, "", channel);
    }
}
