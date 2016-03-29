package Protocol.Handler;

import Listener.MCastSocketListener;
import Protocol.Chunk.Chunk;
import Protocol.Message.Message;
import Protocol.Message.MessageType;
import Utils.Log;
import Utils.Utils;

import java.util.ArrayList;

public class BackupHandler extends Handler{

    MCastSocketListener mc;

    ArrayList<Chunk> storedChunks = new ArrayList<>();

    public BackupHandler(int _peerID, MCastSocketListener _mc) {
        super(_peerID);
        mc = _mc;
    }

    @Override
    public void handle(Message m) {
        if (m.type != MessageType.PUTCHUNK || m.senderID == peerID) {
            //Log.info("Invalid message for backup handler with peer " + peerID, channel);
            return;
        }
        Chunk chunk = new Chunk(m.fileID, m.chunkNo, m.replDeg, m.body);
        if (!storedChunks.contains(chunk)) {
            storedChunks.add(chunk);
            Log.info("Stored chunk \""+chunk+"\" ("+storedChunks.size()+" chunks total)");
        }
        else Log.warning("CHUNK ALREADY STORED - " + m.fileID + " | " + m.chunkNo);

        Message stored = new Message(MessageType.STORED, m.version, peerID, m.fileID, m.chunkNo);
        int delay = Utils.random(0, 400);
        try { Thread.sleep(delay); } catch (InterruptedException e) { e.printStackTrace(); }
        mc.send(stored.toString());
    }
}
