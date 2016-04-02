package Service;

import java.io.File;

public class FileSystem {

    private static String DATABASE_FOLDER, RESTORED_FOLDER;

    private int peerID;

    public FileSystem(int _peerID) {
        peerID = _peerID;
        DATABASE_FOLDER = "./database/peer"+peerID;
        RESTORED_FOLDER = DATABASE_FOLDER+"/restored";

        File tmp = new File(RESTORED_FOLDER);
        tmp.mkdirs();
    }

    public static String getDatabasePathName(String name) {
        return DATABASE_FOLDER+"/"+name;
    }

    public static String getRestoredPathName(String name) {
        return RESTORED_FOLDER+"/"+name;
    }
}
