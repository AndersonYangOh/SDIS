package Protocol.Chunk;

import Protocol.Protocol;
import Utils.Log;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.Arrays;

public class ChunkMaker {
    Chunk[] chunks;

    public ChunkMaker(File file, String fileID, int replDeg) throws Exception {
        final int MAX_SIZE = Protocol.MAX_CHUNK_SIZE;
        byte[] buffer = new byte[MAX_SIZE];

        int numChunks = (int)(file.length() / MAX_SIZE) + 1;
        if (numChunks > 999999) throw new Exception("File is too big (max is 64BG)");
        Log.info("Splitting file " + file.getName() + "(" + file.length() + " bytes)" + " into " + numChunks + " chunk" + (numChunks != 1 ? "s" : ""));
        chunks = new Chunk[numChunks];
        BufferedInputStream bis = new BufferedInputStream(new FileInputStream(file));
        int read;
        for (int i = 0; i < numChunks; ++i) {
            read = bis.read(buffer);
            byte[] content = Arrays.copyOfRange(buffer, 0, (read>=0 ? read : 0));
            chunks[i] = new Chunk(fileID, i, replDeg, content);
        }
        bis.close();
    }

    public Chunk[] getChunks() {
        return chunks;
    }
}
