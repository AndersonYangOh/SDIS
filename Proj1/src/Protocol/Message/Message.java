package Protocol.Message;


import Exception.MessageVersionMismatchException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.DatagramPacket;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Message {
    public MessageType type;
    public String version;
    public int senderID;
    public String fileID;
    public int chunkNo;
    public int replDeg;
    public byte[] body = null;
    public int body_offset = -1;

    public Message(DatagramPacket packet) throws MessageVersionMismatchException {
        this(packet.getData(), packet.getLength());
    }

    public Message(byte[] packet) throws MessageVersionMismatchException {
        this(packet, packet.length);
    }

    public Message(byte[] packet, int length) throws MessageVersionMismatchException {
        extract(new String(packet, 0, length));
        if (body_offset != -1) {
            body = Arrays.copyOfRange(packet, body_offset, length);
        }
    }

    private void extract(String msg_str) throws MessageVersionMismatchException {
        final String msgTypeRegex = "(?<type>PUTCHUNK|STORED|GETCHUNK|CHUNK|DELETE|REMOVED)";
        final String verRegex = "(?<ver>\\d\\.\\d)";
        final String senderIDRegex = "(?<sID>\\d+)";
        final String fileIDRegex = "(?<fID>\\w{64})";
        final String chunkNoRegex = "(?:(?<cNo>\\d{1,6})\\s+)?";
        final String replRegex = "(?:(?<repl>\\d)\\s+)?";
        final String bodyRegex = "(?<body>[\\s\\S]*\\Z)?";

        Pattern p = Pattern.compile( msgTypeRegex+"\\s+"+verRegex+"\\s+"+senderIDRegex+"\\s+"+
                        fileIDRegex+"\\s+"+chunkNoRegex+replRegex+"\\r\\n\\r\\n"+bodyRegex);

        Matcher m = p.matcher(msg_str);
        if (!m.matches()) throw new IllegalArgumentException(msg_str);

        type = MessageType.valueOf(m.group("type"));
        version = m.group("ver");
        if (!version.equals(type.version()))
            throw new MessageVersionMismatchException(type+" - "+type.version());
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

        if (m.group("body") != null) {
            body_offset = m.start("body");
        }

    }

    public Message(MessageType _type, int _sId, String _fId) {
        this(_type, _sId, _fId, 0, 0, null);
    }

    public Message(MessageType _type, int _sId, String _fId, int _cNo) {
        this(_type, _sId, _fId, _cNo, 0, null);
    }

    public Message(MessageType _type, int _sId, String _fId, int _cNo, int _rDeg, byte[] _body) {
        type = _type;
        version = type.version();
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

    public byte[] getBytes() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            out.write(header().getBytes());
            if (body != null) out.write(body);
        } catch (IOException e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    @Override
    public String toString() {
        String aux = header();
        if (type == MessageType.PUTCHUNK || type == MessageType.CHUNK) aux += new String(body);

        return aux;
    }
}
