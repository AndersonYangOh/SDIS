package Protocol.Handler;

import Protocol.Chunk.Chunk;
import Protocol.Message.Message;
import Protocol.Message.MessageType;

public class ChunkHandler extends Handler{
    private Chunk chunk;
    private Chunk stored = null;
    private boolean received = false;
    private boolean storeOnReceive = false;

    public ChunkHandler(Chunk _chunk) { chunk = _chunk; }

    @Override
    public void handle(Message m) {
        if (m.type != MessageType.CHUNK || received) { return; }

        if (m.fileID.equals(chunk.fileID) && m.chunkNo == chunk.chunkNo){
            received = true;
            if (storeOnReceive)
                stored = new Chunk(m.fileID, m.chunkNo, 0, m.body);
        }
    }

    public boolean received() { return received; }

    public void storeOnReceive(boolean b) {
        this.storeOnReceive = b;
    }

    public Chunk getStored() {
        return stored;
    }
}
