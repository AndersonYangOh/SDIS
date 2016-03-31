package Protocol.Handler;

import Listener.MCastSocketListener;
import Protocol.Chunk.Chunk;
import Protocol.Message.Message;
import Protocol.Message.MessageType;
import Service.Database;
import Utils.Log;
import Utils.Utils;

import java.util.ArrayList;
import java.util.HashMap;

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
            if (Database.addChunk(chunk)) {
                Log.info("Stored chunk \""+chunk+"\" ("+Database.chunkSize()+" chunks total)");
            }
            else Log.warning("CHUNK ALREADY STORED - " + m.fileID + " | " + m.chunkNo);

            Message stored = new Message(MessageType.STORED, m.version, peerID, m.fileID, m.chunkNo);
            int delay = Utils.random(0, 400);
            try { Thread.sleep(delay); } catch (InterruptedException e) { e.printStackTrace(); }
            mc.send(stored.toString());
        }
    }
}
