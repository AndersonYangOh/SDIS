package Protocol.Message;

import Utils.Utils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Message {
    public MessageType type;
    public String version;
    public int senderID;
    public String fileID;
    public int chunkNo;
    public int replDeg;
    public byte[] body;

    private final String msgTypeRegex = "(?<type>PUTCHUNK|STORED|GETCHUNK|CHUNK|DELETE|REMOVED)";
    private final String verRegex = "(?<ver>\\d\\.\\d)";
    private final String senderIDRegex = "(?<sID>\\d+)";
    private final String fileIDRegex = "(?<fID>\\w{64})";
    private final String chunkNoRegex = "(?:(?<cNo>\\d{1,6})\\s+)?";
    private final String replRegex = "(?:(?<repl>\\d)\\s+)?";
    private final String bodyRegex = "(?<body>.*$)?";

    public Message(String msg_str) {
        Pattern p = Pattern.compile( msgTypeRegex+"\\s+"+verRegex+"\\s+"+senderIDRegex+"\\s+"+
                        fileIDRegex+"\\s+"+chunkNoRegex+replRegex+"\\r\\n\\r\\n"+bodyRegex);

        Matcher m = p.matcher(msg_str);
        if (!m.matches()) throw new IllegalArgumentException(msg_str);

        type = MessageType.valueOf(m.group("type"));
        version = m.group("ver");
        senderID = Integer.parseInt(m.group("sID"));
        fileID = m.group("fID");

        if (m.group("cNo") != null && type != MessageType.DELETE) chunkNo = Integer.parseInt(m.group("cNo"));
        else if (m.group("cNo") == null && type != MessageType.DELETE) throw new IllegalArgumentException(msg_str);

        if (m.group("repl") != null) {
            if (type == MessageType.PUTCHUNK)
                replDeg = Integer.parseInt(m.group("repl"));
            else throw new IllegalArgumentException(msg_str);
        }
        else if (type == MessageType.PUTCHUNK)
            throw new IllegalArgumentException(msg_str);

        if (m.group("body") != null)
            body = m.group("body").getBytes();
    }

    public Message(MessageType _type, String _ver, int _sId, String _fId) {
        this(_type, _ver, _sId, _fId, 0, 0, null);
    }

    public Message(MessageType _type, String _ver, int _sId, String _fId, int _cNo) {
        this(_type, _ver, _sId, _fId, _cNo, 0, null);
    }

    public Message(MessageType _type, String _ver, int _sId, String _fId, int _cNo, int _rDeg, byte[] _body) {
        type = _type;
        version = _ver;
        senderID = _sId;
        fileID = _fId;
        chunkNo = _cNo;
        replDeg = _rDeg;
        body = _body;
    }

    public String header() {
        String aux = type+" "+version+" "+senderID+" "+fileID+" ";
        if (type != MessageType.DELETE) aux += chunkNo+" ";
        if (type == MessageType.PUTCHUNK) aux += replDeg+" ";
        aux += "\r\n\r\n";

        return aux;
    }

    @Override
    public String toString() {
        String aux = header();
        if (type == MessageType.PUTCHUNK || type == MessageType.CHUNK) aux += body;

        return aux;
    }
}
