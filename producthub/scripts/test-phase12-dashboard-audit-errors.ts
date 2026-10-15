import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { connectDB } from '../src/core/db/connect';
import { AuditService } from '../src/modules/audit/services/audit.service';
import { ErrorMonitoringService } from '../src/modules/errors/services/error-monitoring.service';
import AuditLog from '../src/modules/audit/infra/audit-log.model';
import SystemError from '../src/modules/errors/infra/system-error.model';

async function runTest() {
  console.log('--- BẮT ĐẦU TEST GIAI ĐOẠN 4, 5, 6: DASHBOARD, AUDIT LOG & ERROR MONITORING ---');
  await connectDB();

  // 1. Test Audit Log
  console.log('1. Ghi Audit Log với dữ liệu nhạy cảm...');
  const auditItem = await AuditService.log({
    actorUserId: 'user-test-123',
    actorNameSnapshot: 'Admin Test',
    actorEmailSnapshot: 'admin@storeproduct.local',
    action: 'settings.update',
    resourceType: 'setting',
    resourceId: 'site_name',
    summary: 'Cập nhật tên website thành StoreProduct Pro',
    changes: {
      oldName: 'StoreProduct',
      newName: 'StoreProduct Pro',
      password: 'MySecretPassword123!',
      apiKey: 'sec_abcdef1234567890',
    },
  });

  if (!auditItem) throw new Error('Không ghi được audit log');
  console.log('=> Đã ghi Audit Log ID:', auditItem._id.toString());

  // Kiểm tra sensitive fields đã bị che
  if (auditItem.changes?.password !== '••••••••' || auditItem.changes?.apiKey !== '••••••••') {
    throw new Error('LỖI BẢO MẬT: Dữ liệu nhạy cảm chưa được che giấu trong Audit Log!');
  }
  console.log('=> Đã xác nhận: password và apiKey được che giấu an toàn thành ••••••••');

  // Test query audit logs
  console.log('2. Truy vấn danh sách Audit Log...');
  const logsRes = await AuditService.listLogs({ action: 'settings.update', limit: 10 });
  if (logsRes.logs.length === 0) throw new Error('Không tìm thấy audit log vừa ghi');
  console.log(`=> Tìm thấy ${logsRes.logs.length} bản ghi với filter action 'settings.update'`);

  // 2. Test Error Monitoring with Fingerprint Deduplication
  console.log('3. Ghi nhận sự cố hệ thống lần 1...');
  const errorItem1 = await ErrorMonitoringService.captureError({
    title: 'Google Drive Rate Limit Reached',
    message: 'User request exceeded rate limit for file 66f001122334455667788990 in /api/v1/media',
    category: 'storage',
    severity: 'high',
    route: '/api/v1/media/upload',
    stackTrace: 'Error: Rate limit at GoogleDriveService.upload (Bearer ya29.a0AfH6SM...)\n    at Object.test',
  });

  if (!errorItem1) throw new Error('Không ghi nhận được error');
  console.log(`=> Lỗi 1 ghi nhận thành công: ${errorItem1.errorId} | Fingerprint: ${errorItem1.fingerprint} | Lặp: ${errorItem1.occurrenceCount}x`);

  // Ghi nhận sự cố lần 2 với cùng lỗi nhưng ID khác (sẽ được normalize thành <ObjectId>)
  console.log('4. Ghi nhận sự cố tương tự lần 2 (Kiểm tra gom nhóm Fingerprint)...');
  const errorItem2 = await ErrorMonitoringService.captureError({
    title: 'Google Drive Rate Limit Reached',
    message: 'User request exceeded rate limit for file 77a112233445566778899001 in /api/v1/media',
    category: 'storage',
    severity: 'high',
    route: '/api/v1/media/upload',
  });

  if (!errorItem2) throw new Error('Không ghi nhận được error lần 2');
  if (errorItem2.fingerprint !== errorItem1.fingerprint) {
    throw new Error('LỖI GOM NHÓM: Hai lỗi giống nhau không có cùng fingerprint!');
  }
  if (errorItem2.occurrenceCount < 2) {
    throw new Error('LỖI GOM NHÓM: occurrenceCount không tăng lên sau khi trùng fingerprint!');
  }
  console.log(`=> Gom nhóm Fingerprint thành công! Lỗi ${errorItem2.errorId} có occurrenceCount = ${errorItem2.occurrenceCount}`);

  // 3. Test Cập nhật trạng thái sự cố
  console.log('5. Cập nhật trạng thái sự cố sang investigating...');
  const updatedErr = await ErrorMonitoringService.updateStatus(
    errorItem1._id.toString(),
    'investigating',
    'Đang kiểm tra quota Google Drive',
    'admin-tester'
  );
  if (updatedErr.status !== 'investigating') throw new Error('Cập nhật status thất bại');
  console.log('=> Cập nhật trạng thái sự cố thành công.');

  // 4. Test Error Stats
  console.log('6. Lấy thống kê sự cố...');
  const stats = await ErrorMonitoringService.getErrorStats();
  console.log('=> Thống kê:', stats);
  if (stats.unresolved === 0) throw new Error('Stats unresolved không đúng');

  // Dọn dẹp bản ghi test
  await AuditLog.deleteOne({ _id: auditItem._id });
  await SystemError.deleteOne({ _id: errorItem1._id });
  console.log('=> Đã dọn dẹp dữ liệu test sạch sẽ.');

  console.log('--- GIAI ĐOẠN 4, 5, 6: TẤT CẢ KIỂM THỬ ĐỀU ĐẠT THÀNH CÔNG! ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('LỖI KIỂM THỬ:', err);
  process.exit(1);
});
