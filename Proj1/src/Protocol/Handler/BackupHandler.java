package Protocol.Handler;

import Listener.MCastSocketListener;
import Protocol.Chunk.Chunk;
import Protocol.Message.Message;
import Protocol.Message.MessageType;
import Service.Database;
import Utils.Log;
import Utils.Utils;

public class BackupHandler extends Handler{

    MCastSocketListener mc;

    public BackupHandler(int _peerID, MCastSocketListener _mc) {
        super(_peerID);
        mc = _mc;
    }

    @Override
    public void handle(Message m) {
        if (m.type != MessageType.PUTCHUNK) {
            return;
        }
        if (m.senderID == peerID) return;

        Chunk chunk = new Chunk(m);
        if (m.type == MessageType.PUTCHUNK) {

            int timeoutDelay = Utils.random(0, 400);
            boolean exists = Database.hasChunk(chunk);

            StoredHandler storedHandler = new StoredHandler(peerID, chunk);
            mc.addHandler(storedHandler);
            try {
                Thread.sleep(timeoutDelay);
            } catch (InterruptedException e) { e.printStackTrace(); }

            Message stored = new Message(MessageType.STORED, m.version, peerID, m.fileID, m.chunkNo);
            if (exists) {
                Log.warning("CHUNK ALREADY STORED - " + m.fileID + " | " + m.chunkNo);
                mc.send(stored.toString());
            }
            else if (storedHandler.getCount() < chunk.replDeg){
                Database.addChunk(chunk);
                Log.info("Stored chunk ["+chunk+"] ("+Database.numChunks()+" chunks total)");
                mc.send(stored.toString());
            }
            else {
                Log.info("No need to store chunk "+chunk+
                        " because the desired replication degree has been reached ("
                        +storedHandler.getCount()+")");
            }
            mc.removeHandler(storedHandler);
        }
    }
}
