package Message;

import Utils.Utils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Message {
    MessageType type;
    String version;
    int senderID;
    String fileID;
    int chunkNo;
    int replDeg;
    String body;

    private final String msgTypeRegex = "(?<type>PUTCHUNK|STORED|GETCHUNK|CHUNK|DELETE|REMOVED)";
    private final String verRegex = "(?<ver>\\d\\.\\d)";
    private final String senderIDRegex = "(?<sID>\\d+)";
    private final String fileIDRegex = "(?<fID>\\w{64})";
    private final String chunkNoRegex = "(?<cNo>\\d{1,6})";
    private final String replRegex = "(?:(?<repl>\\d)\\s+)?";
    private final String bodyRegex = "(?<body>.*$)?";

    public Message(String msg_str) {
        Pattern p = Pattern.compile( msgTypeRegex+"\\s+"+verRegex+"\\s+"+senderIDRegex+"\\s+"+
                        fileIDRegex+"\\s+"+chunkNoRegex+"\\s"+replRegex+"\\r\\n\\r\\n"+bodyRegex);

        Matcher m = p.matcher(msg_str);
        if (!m.matches()) throw new IllegalArgumentException(msg_str);

        type = MessageType.valueOf(m.group("type"));
        version = m.group("ver");
        senderID = Integer.parseInt(m.group("sID"));
        fileID = m.group("fID");
        chunkNo = Integer.parseInt(m.group("cNo"));
        if (m.group("repl") != null) {
            if (type == MessageType.PUTCHUNK)
                replDeg = Integer.parseInt(m.group("repl"));
            else throw new IllegalArgumentException(msg_str);
        }
        else if (type == MessageType.PUTCHUNK)
            throw new IllegalArgumentException(msg_str);

        if (m.group("body") != null)
            body = m.group("body");
    }

    public Message() {
        type = MessageType.PUTCHUNK;
        version = "1.0";
        senderID = 1;
        fileID = Utils.sha256("testfile.txt");
        chunkNo = 1;
        replDeg = 1;
        body = "Hello from the otter side!";
    }

    public String toString() {
        return type+" "+version+" "+senderID+" "+fileID+" "+chunkNo+" "+(type==MessageType.PUTCHUNK ? replDeg+" " : "") + "\r\n\r\n" + (!body.isEmpty() ? body : "");
    }

    public static void main(String[] args) {
        Message m = new Message();
        System.out.println(m.toString());
    }
}
