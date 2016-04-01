package Protocol.Handler;

import Protocol.Message.Message;
import Protocol.Message.MessageType;
import Service.Database;
import Utils.Log;

public class DeleteHandler extends Handler{
    @Override
    public void handle(Message m) {
        if (m.type != MessageType.DELETE) return;

        int init = Database.numChunks();
        int deleted;
        Database.deleteFile(m.fileID);
        deleted = Math.abs(init-Database.numChunks());
        Log.info("Stored chunks after deletion: "+Database.numChunks()+" ("+deleted+" deleted)");
    }
}
