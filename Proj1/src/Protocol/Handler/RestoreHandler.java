package Protocol.Handler;

import Listener.MCastSocketListener;
import Protocol.Chunk.Chunk;
import Protocol.Message.Message;
import Protocol.Message.MessageType;
import Service.Database;
import Utils.Log;
import Utils.Timeout;
import Utils.Utils;

public class RestoreHandler extends Handler{

    MCastSocketListener mdr;

    public RestoreHandler(int _peerID, MCastSocketListener _mdr) {
        super(_peerID);
        mdr = _mdr;
    }

    @Override
    public void handle(Message m) {
        if (m.type != MessageType.GETCHUNK) {
            return;
        }

        Chunk chunk = new Chunk(m);

        try {
            Chunk recoverChunk = Database.getChunk(chunk);
            Message chunkMsg = new Message(MessageType.CHUNK, "1.0", peerID, recoverChunk.fileID, recoverChunk.chunkNo);
            chunkMsg.body = recoverChunk.data;

            ChunkHandler chunkHandler = new ChunkHandler(chunk);
            mdr.addHandler(chunkHandler);

            int timeoutDelay = Utils.random(0, 400);
            Thread t = new Thread(new Timeout(timeoutDelay));
            t.start();

            while (true) {
                if (chunkHandler.received()) {
                    break;
                }
                if (!t.isAlive()) {
                    Log.info("Sending chunk ("+recoverChunk+")");
                    mdr.send(chunkMsg);
                    break;
                }
            }

            mdr.removeHandler(chunkHandler);
        }
        catch (IllegalArgumentException e) {
            Log.warning("Chunk ("+chunk+") not in database");
        }
    }
}
