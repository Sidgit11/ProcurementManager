CREATE INDEX "buy_opportunity_org_status_created_idx" ON "buy_opportunity" USING btree ("org_id","status","created_at");--> statement-breakpoint
CREATE INDEX "extraction_job_org_status_created_idx" ON "extraction_job" USING btree ("org_id","status","created_at");--> statement-breakpoint
CREATE INDEX "notification_user_unread_idx" ON "notification" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notification_org_created_idx" ON "notification" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "quote_org_captured_at_idx" ON "quote" USING btree ("org_id","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_score_vendor_uniq" ON "vendor_score" USING btree ("vendor_id");