type ErrorViewProps = {
  code: string;
  message: string;
};

export function ErrorView({ code, message }: ErrorViewProps) {
  return (
    <section className="card error-card">
      <h2>Request Failed</h2>
      <p>
        <strong>Code:</strong> {code}
      </p>
      <p>
        <strong>Message:</strong> {message}
      </p>
    </section>
  );
}
