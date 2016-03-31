package Protocol.Chunk;

import Protocol.Message.Message;

import java.util.ArrayList;

public class Chunk {
    public String fileID;
    public int chunkNo;
    public int replDeg;

    public byte[] data;

    private ArrayList<Integer> storedIn = new ArrayList<>();

    public Chunk(Message m) {
        this(m.fileID, m.chunkNo, m.replDeg, m.body);
    }

    public Chunk(String _fileId, int _chunkNo, int _replDeg, byte[] _data) {
        fileID = _fileId;
        chunkNo = _chunkNo;
        replDeg = _replDeg;
        data = _data;
    }

    public boolean stored(int peerID) {
        if (!storedIn.contains(peerID)) {
            storedIn.add(peerID);
            return true;
        }
        return false;
    }

    public int getRealReplDeg() {
        return storedIn.size();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        Chunk other = (Chunk) o;

        return (fileID.equals(other.fileID) && chunkNo == other.chunkNo);
    }

    @Override
    public String toString() {
        return fileID + " " + chunkNo;
    }
}
