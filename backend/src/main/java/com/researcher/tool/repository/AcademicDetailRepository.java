package com.researcher.tool.repository;

import com.researcher.tool.model.AcademicDetail;
import com.researcher.tool.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AcademicDetailRepository extends JpaRepository<AcademicDetail, Long> {
    Optional<AcademicDetail> findByUser(User user);
}
