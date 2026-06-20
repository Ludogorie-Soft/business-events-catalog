import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { issueEmailVerification } from "../src/lib/email-verification-service";

async function main() {
  const user = await prisma.user.findFirst({
    where: { emailVerifiedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!user) {
    console.log("No unverified user found");
    return;
  }

  console.log("Testing confirmation email for:", user.email);
  const { result } = await issueEmailVerification(user.id);
  console.log("Send result:", result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
