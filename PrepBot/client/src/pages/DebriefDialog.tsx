import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

const RESEARCHER_EMAIL = "digu00002@stud.uni-saarland.de";

type DebriefDialogProps = {
  open: boolean;
  onClose: () => void;
  mode: "completed" | "withdrawn";
};

export default function DebriefDialog({ open, onClose, mode }: DebriefDialogProps) {
  return (
    <Dialog
      open={open}
      PaperProps={{
        sx: {
          borderRadius: "16px", p: 3, width: "90%", maxWidth: 520,
          background: "linear-gradient(145deg, #f7faff, #edf4fb)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, color: "#07466E", textAlign: "center" }}>
        Study Debrief
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.95rem", color: "#333", lineHeight: 1.7 }}>
          {mode === "completed"
            ? "Thank you for completing the session."
            : "Thank you for taking part. Your withdrawal from the study has been recorded."}{" "}
          We can now inform you that some feedback presented during the study{" "}
          <b>may have contained intentionally introduced evaluation inaccuracies</b>. This was
          necessary because informing participants in advance could have influenced their
          responses and affected the study results.
          <br /><br />
          Your data will be used <b>solely for research purposes</b>. If, after learning this,
          you would prefer to withdraw your data or have any questions, you may contact the
          researcher at <b>{RESEARCHER_EMAIL}</b>.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pb: 1 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{ px: 4, borderRadius: "18px", textTransform: "none",
            backgroundColor: "#07466E", "&:hover": { backgroundColor: "#063655" } }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}