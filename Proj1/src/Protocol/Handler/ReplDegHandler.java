package Protocol.Handler;

import Protocol.Chunk.Chunk;
import Protocol.Message.Message;
import Protocol.Message.MessageType;
import Service.Database;


public class ReplDegHandler extends Handler{

    public ReplDegHandler(int _peerID) {
        super(_peerID);
    }

    @Override
    public void handle(Message m) {
        if (m.type != MessageType.STORED) {
            return;
        }
        Chunk chunk = new Chunk(m);

        try {
            Chunk c = Database.getChunk(chunk);
            c.stored(m.senderID);
        } catch (IllegalArgumentException e) {
        }
    }
}
