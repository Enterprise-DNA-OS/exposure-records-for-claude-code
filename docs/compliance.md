# Record controls and their sources

This is a group-level records desk. A competent occupational hygienist decides the monitoring programme, sample validity, exposure interpretation and necessary controls. The software does not calculate exposure, prescribe a safe level, certify compliance, notify regulators or store clinical examinations. A typed reviewer name records attribution; it is not an authenticated signature.

Checked 13 November 2026. NZ rules are based on WorkSafe's General risk and workplace management, part 1, sections 5.4 and 5.5:
https://www.worksafe.govt.nz/managing-health-and-safety/businesses/general-requirements-for-workplaces/general-risk-and-workplace-management-part-1/

- NZ-retention: the view shows an earliest retention date from the recorded creation date, using 40 years for asbestos-related exposure monitoring and 30 for other exposure monitoring under the guidance on regulations 32(2) and (3). Original evidence is append-only. There is no deletion command. This is not automatic permission to destroy a record on that date. Confirm applicability and longer holds with the responsible professional.
- Disclosure and access: the same guidance requires readily accessible records and removal of information identifying another individual before sharing. Generated packets stay private. The CLI does not enforce per-worker access or automatic redaction. Use an approved access and disclosure process before releasing anything.
- Follow-up-owner: the guidance refers to reviewing controls when exposure monitoring exceeds a prescribed exposure standard. This software does not decide exceedance. It flags a human review marked follow_up when there is no open action. The reviewer decides whether further work is needed.

Local operating policy, not legal deadlines:

- source-method flags a blank sampling method reference.
- review-pending flags missing qualified review evidence.
- access-review flags the date set by the operator for an access review.
- Sampling and group-review due dates come from the responsible hygienist. No universal sampling interval is invented.

AU-jurisdiction-review always requests confirmation of applicable state or territory record retention and disclosure requirements. The base does not copy NZ retention dates onto Australian samples. Do not read a blank date as no retention duty.

The database owner can bypass row policies and triggers. Hosted multi-user use requires enforced identity, least privilege, tested backups and restoration, retention holds and a reviewed disclosure process. No clinical or worker-identifying data belongs in the demonstration or in git. Report and method references must resolve to your controlled evidence store; the software does not verify the referenced documents exist.
