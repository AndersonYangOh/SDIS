package Protocol.Chunk;

public class Chunk {
    public String fileID;
    public int chunkNo;
    public int replDeg;

    public byte[] data;

    public Chunk(String _fileId, int _chunkNo, int _replDeg, byte[] _data) {
        fileID = _fileId;
        chunkNo = _chunkNo;
        replDeg = _replDeg;
        data = _data;
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
