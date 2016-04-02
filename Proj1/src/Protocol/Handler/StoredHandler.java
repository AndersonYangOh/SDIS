package Protocol.Handler;

import Protocol.Chunk.Chunk;
import Protocol.Message.Message;
import Protocol.Message.MessageType;

import java.util.ArrayList;

public class StoredHandler extends Handler{

    private Chunk chunk;
    private ArrayList<Integer> storedPeers = new ArrayList<>();

    public StoredHandler(int _peerID, Chunk _chunk) {
        super(_peerID);
        chunk = _chunk;
    }

    @Override
    public void handle(Message m) {
        if (m.type != MessageType.STORED || m.senderID == peerID) {
            //Log.info("Invalid message for stored handler with peer " + peerID, channel);
            return;
        }
        if (m.fileID.equals(chunk.fileID) && m.chunkNo == chunk.chunkNo) {
            if (!storedPeers.contains(m.senderID)) storedPeers.add(m.senderID);
        }
    }

    public void clear() { storedPeers.clear(); }
    public int getCount() { return storedPeers.size(); }
}
