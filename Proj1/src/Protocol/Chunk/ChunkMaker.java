package Protocol.Chunk;

import Protocol.Message.Message;
import Protocol.Message.MessageType;
import Protocol.Protocol;
import Utils.Log;
import Utils.Utils;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.Arrays;

public class ChunkMaker {
    Chunk[] chunks;

    public ChunkMaker(File file, int replDeg) throws Exception {
        String fileID = Utils.getFileID(file);
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

    public static void main(String[] args) {
        try {
            ChunkMaker cm = new ChunkMaker(new File("example.txt"), 1);
            Chunk[] chunks = cm.getChunks();
            for (Chunk c : chunks) {
                Message putchunk_msg = new Message(MessageType.PUTCHUNK, 1, c.fileID, c.chunkNo, c.replDeg, c.data);
                //putchunk_msg.body = "LOLOLOLOLOLOL".getBytes();
                System.out.println("Chunk: "+putchunk_msg.body.length);
                Message received = new Message(putchunk_msg.getBytes());
                System.out.println("Message: "+received.body.length);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
